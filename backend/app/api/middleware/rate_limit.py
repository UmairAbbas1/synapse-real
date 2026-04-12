"""Redis-backed rate limit structures executing safe query limits mapping user boundaries efficiently."""

from fastapi import Request, HTTPException, status, Depends
from redis.asyncio import Redis

from app.dependencies import get_redis

async def check_rate_limit(request: Request, redis: Redis = Depends(get_redis)):
    """Evaluate users strictly tracking API counts explicitly generating block logic dynamically."""
    
    user = getattr(request.state, "user", None)
    user_id = user.get("sub") if isinstance(user, dict) else getattr(user, "id", "anonymous") if user else "anonymous"
    
    key = f"rate_limit:{user_id}"
    
    current = await redis.get(key)
    if current and int(current) >= 60:
        ttl = await redis.ttl(key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait.",
            headers={"Retry-After": str(ttl if ttl > 0 else 60)}
        )
        
    pipe = redis.pipeline()
    pipe.incr(key)
    if not current:
        pipe.expire(key, 60)
    await pipe.execute()
