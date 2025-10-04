-- src/rate-limit/strategies/token-bucket.lua
-- KEYS[1] key
-- ARGV[1]=now(ms), ARGV[2]=capacity, ARGV[3]=refillTokens, ARGV[4]=refillInterval(ms)
-- HASH fields: tokens, lastRefill
local cap = tonumber(ARGV[2])
local now = tonumber(ARGV[1])
local refill = tonumber(ARGV[3])
local interval = tonumber(ARGV[4])

local data = redis.call('HMGET', KEYS[1], 'tokens', 'lastRefill')
local tokens = tonumber(data[1]) or cap
local last = tonumber(data[2]) or now

local elapsed = now - last
if elapsed >= interval then
  local cycles = math.floor(elapsed / interval)
  tokens = math.min(cap, tokens + cycles * refill)
  last = last + cycles * interval
end

if tokens <= 0 then
  redis.call('HMSET', KEYS[1], 'tokens', tokens, 'lastRefill', last)
  redis.call('PEXPIRE', KEYS[1], interval * 2)
  return {0, tokens}
else
  tokens = tokens - 1
  redis.call('HMSET', KEYS[1], 'tokens', tokens, 'lastRefill', last)
  redis.call('PEXPIRE', KEYS[1], interval * 2)
  return {1, tokens}
end
