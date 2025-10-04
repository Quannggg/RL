redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, tonumber(ARGV[1]) - tonumber(ARGV[2]))
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[3]) then
  return {0, count}
else
  redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1])
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  return {1, count + 1}
end
