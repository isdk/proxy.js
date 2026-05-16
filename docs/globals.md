[**@isdk/proxy**](README.md)

***

# @isdk/proxy

## Classes

- [OfflineCacheMissError](classes/OfflineCacheMissError.md)
- [SmartCache](classes/SmartCache.md)

## Interfaces

- [CacheAnalysis](interfaces/CacheAnalysis.md)
- [FetchWithCacheContext](interfaces/FetchWithCacheContext.md)
- [FetchWithCacheOptions](interfaces/FetchWithCacheOptions.md)
- [PrefetchOptions](interfaces/PrefetchOptions.md)
- [PrefetchRequest](interfaces/PrefetchRequest.md)
- [PrefetchResult](interfaces/PrefetchResult.md)
- [ProxyBodyConfig](interfaces/ProxyBodyConfig.md)
- [ProxyCacheEntry](interfaces/ProxyCacheEntry.md)
- [ProxyCacheMetadata](interfaces/ProxyCacheMetadata.md)
- [ProxyCacheRule](interfaces/ProxyCacheRule.md)
- [ProxyConfig](interfaces/ProxyConfig.md)
- [ProxySiteConfig](interfaces/ProxySiteConfig.md)
- [ResponseCacheCheckResult](interfaces/ResponseCacheCheckResult.md)
- [SmartCacheOptions](interfaces/SmartCacheOptions.md)

## Type Aliases

- [ProxyFieldConfig](type-aliases/ProxyFieldConfig.md)
- [ProxyMatchPattern](type-aliases/ProxyMatchPattern.md)
- [ProxyMatchPatterns](type-aliases/ProxyMatchPatterns.md)

## Variables

- [AWS\_WAF\_PRESET](variables/AWS_WAF_PRESET.md)
- [CLOUDFLARE\_WAF\_PRESET](variables/CLOUDFLARE_WAF_PRESET.md)
- [GENERAL\_WAF\_PRESET](variables/GENERAL_WAF_PRESET.md)
- [OfflineCacheMissErrorCode](variables/OfflineCacheMissErrorCode.md)
- [OfflineCacheMissErrorMsg](variables/OfflineCacheMissErrorMsg.md)

## Functions

- [clearWAFPresets](functions/clearWAFPresets.md)
- [createCachedFetch](functions/createCachedFetch.md)
- [createFetchWithCache](functions/createFetchWithCache.md)
- [createResponse](functions/createResponse.md)
- [decorateResponseWithUrl](functions/decorateResponseWithUrl.md)
- [extractData](functions/extractData.md)
- [fetchWithCache](functions/fetchWithCache.md)
- [generateCacheKey](functions/generateCacheKey.md)
- [getEffectiveConfig](functions/getEffectiveConfig.md)
- [getEffectiveConfigFromRequest](functions/getEffectiveConfigFromRequest.md)
- [getMatchedRule](functions/getMatchedRule.md)
- [getSiteConfig](functions/getSiteConfig.md)
- [getWAFPresets](functions/getWAFPresets.md)
- [isAllowed](functions/isAllowed.md)
- [isCacheable](functions/isCacheable.md)
- [isGlob](functions/isGlob.md)
- [isMatch](functions/isMatch.md)
- [isResponseCacheable](functions/isResponseCacheable.md)
- [isWAFChallenge](functions/isWAFChallenge.md)
- [matchField](functions/matchField.md)
- [normalizeBodyConfig](functions/normalizeBodyConfig.md)
- [prefetch](functions/prefetch.md)
- [registerWAFPreset](functions/registerWAFPreset.md)
- [unregisterWAFPreset](functions/unregisterWAFPreset.md)
