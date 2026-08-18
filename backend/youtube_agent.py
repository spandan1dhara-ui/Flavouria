"""Real-time YouTube AI recipe agent.

Server-side pipeline:
1. Search YouTube for recipe videos for a dish query.
2. Fetch live statistics (views, likes, comments).
3. Rank by a blend of views, likes, engagement and positive comment sentiment
   (so the Top 3 shifts over time as popularity/engagement changes).
4. Summarize each of the Top 3 with an LLM: summary, ingredients, method, tips, sentiment.

Results are cached briefly (per query) to conserve YouTube quota and speed up repeat searches.
"""
import os
import re
import json
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from googleapiclient.discovery import build
from emergentintegrations.llm.chat import LlmChat, UserMessage

from database import db

logger = logging.getLogger("flavouria.youtube")

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
LLM_MODEL = os.environ.get("YOUTUBE_LLM_MODEL", "claude-sonnet-4-6")
CACHE_TTL_MIN = 180  # refresh live rankings every 3 hours

POSITIVE = {"amazing", "delicious", "great", "love", "loved", "perfect", "best", "awesome", "yummy",
            "tasty", "excellent", "wonderful", "easy", "thank", "thanks", "helpful", "superb", "nice",
            "fantastic", "worked", "works", "authentic", "favorite", "favourite", "super"}
NEGATIVE = {"bad", "worst", "bland", "disgusting", "terrible", "awful", "hate", "gross", "waste",
            "dislike", "boring", "burnt", "salty", "undercooked", "disappointing", "poor", "wrong"}


def _yt():
    return build("youtube", "v3", developerKey=YOUTUBE_API_KEY, cache_discovery=False)


def _search_and_stats(query):
    yt = _yt()
    sr = yt.search().list(part="snippet", q=f"{query} recipe", type="video",
                          maxResults=8, order="relevance", videoEmbeddable="true",
                          relevanceLanguage="en", safeSearch="strict").execute()
    ids = [it["id"]["videoId"] for it in sr.get("items", []) if it.get("id", {}).get("videoId")]
    if not ids:
        return []
    stats = yt.videos().list(part="statistics,snippet", id=",".join(ids)).execute()
    out = []
    for it in stats.get("items", []):
        s = it.get("statistics", {})
        sn = it.get("snippet", {})
        thumbs = sn.get("thumbnails", {})
        thumb = (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url")
        out.append({
            "video_id": it["id"],
            "title": sn.get("title"),
            "channel": sn.get("channelTitle"),
            "description": sn.get("description", ""),
            "thumbnail": thumb,
            "views": int(s.get("viewCount", 0)),
            "likes": int(s.get("likeCount", 0)) if "likeCount" in s else 0,
            "comment_count": int(s.get("commentCount", 0)) if "commentCount" in s else 0,
        })
    return out


def _top_comments(video_id, n=18):
    try:
        yt = _yt()
        r = yt.commentThreads().list(part="snippet", videoId=video_id, maxResults=n,
                                     order="relevance", textFormat="plainText").execute()
        return [i["snippet"]["topLevelComment"]["snippet"]["textDisplay"]
                for i in r.get("items", [])]
    except Exception:
        return []


def _positivity(comments):
    if not comments:
        return 0.5
    pos = neg = 0
    for c in comments:
        words = set(re.findall(r"[a-z']+", c.lower()))
        pos += len(words & POSITIVE)
        neg += len(words & NEGATIVE)
    total = pos + neg
    return pos / total if total else 0.55


def _normalize(vals):
    lo, hi = min(vals), max(vals)
    if hi == lo:
        return [0.5 for _ in vals]
    return [(v - lo) / (hi - lo) for v in vals]


async def _summarize(video, comments):
    prompt = (
        f"You are a cooking assistant. Analyze this YouTube cooking video and its viewer comments.\n\n"
        f"TITLE: {video['title']}\nCHANNEL: {video['channel']}\n"
        f"DESCRIPTION:\n{(video['description'] or '')[:1500]}\n\n"
        f"TOP COMMENTS:\n" + "\n".join(f"- {c}" for c in comments[:15]) + "\n\n"
        "Return ONLY valid JSON (no markdown) with this exact shape:\n"
        '{"summary": "2-3 sentence overview of the dish/recipe", '
        '"ingredients": ["item with rough quantity", ...], '
        '"method": ["step 1", "step 2", ...], '
        '"tips": ["notable tip surfaced from the comments", ...], '
        '"sentiment": "positive|mixed|negative"}\n'
        "If ingredients or steps are not stated, infer the most likely ones for this dish. "
        "Keep ingredients under 14 items and method under 10 steps."
    )
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"yt-{video['video_id']}",
                       system_message="You extract clean, structured recipe data as strict JSON.")
        chat.with_model("anthropic", LLM_MODEL)
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else str(resp)
        m = re.search(r"\{.*\}", text, re.DOTALL)
        data = json.loads(m.group(0)) if m else {}
    except Exception as e:
        logger.warning(f"LLM summarize failed for {video['video_id']}: {e}")
        data = {}
    return {
        "summary": data.get("summary") or "A popular recipe video for this dish.",
        "ingredients": data.get("ingredients") or [],
        "method": data.get("method") or [],
        "tips": data.get("tips") or [],
        "sentiment": data.get("sentiment") or "positive",
    }


async def search_youtube_recipes(query):
    key = query.strip().lower()
    if not key:
        return {"query": query, "videos": []}

    cached = await db.youtube_cache.find_one({"key": key}, {"_id": 0})
    if cached:
        ts = datetime.fromisoformat(cached["cached_at"])
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if ts > datetime.now(timezone.utc) - timedelta(minutes=CACHE_TTL_MIN):
            return {"query": query, "videos": cached["videos"], "cached": True}

    if not YOUTUBE_API_KEY:
        return {"query": query, "videos": [], "error": "YouTube API not configured"}

    candidates = await asyncio.to_thread(_search_and_stats, query)
    if not candidates:
        return {"query": query, "videos": []}

    # Base ranking on live popularity + engagement
    nv = _normalize([c["views"] for c in candidates])
    nl = _normalize([c["likes"] for c in candidates])
    for i, c in enumerate(candidates):
        engagement = (c["likes"] / c["views"]) if c["views"] else 0
        c["_base"] = 0.55 * nv[i] + 0.30 * nl[i] + 0.15 * min(engagement * 20, 1.0)
    candidates.sort(key=lambda x: x["_base"], reverse=True)
    shortlist = candidates[:4]

    # Add comment sentiment to the shortlist
    comment_map = {}
    comments_lists = await asyncio.gather(*[asyncio.to_thread(_top_comments, c["video_id"]) for c in shortlist])
    for c, cm in zip(shortlist, comments_lists):
        comment_map[c["video_id"]] = cm
        c["_sentiment"] = _positivity(cm)
    for c in shortlist:
        c["_final"] = c["_base"] * 0.8 + c["_sentiment"] * 0.2
    shortlist.sort(key=lambda x: x["_final"], reverse=True)
    top3 = shortlist[:3]

    summaries = await asyncio.gather(*[_summarize(c, comment_map.get(c["video_id"], [])) for c in top3])

    videos = []
    for rank, (c, sm) in enumerate(zip(top3, summaries), start=1):
        videos.append({
            "rank": rank, "video_id": c["video_id"], "title": c["title"], "channel": c["channel"],
            "thumbnail": c["thumbnail"], "views": c["views"], "likes": c["likes"],
            "comment_count": c["comment_count"],
            "summary": sm["summary"], "ingredients": sm["ingredients"], "method": sm["method"],
            "tips": sm["tips"], "sentiment": sm["sentiment"],
        })

    await db.youtube_cache.update_one(
        {"key": key},
        {"$set": {"key": key, "videos": videos, "cached_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"query": query, "videos": videos}
