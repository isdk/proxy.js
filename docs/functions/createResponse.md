[**@isdk/proxy**](../README.md)

***

[@isdk/proxy](../globals.md) / createResponse

# Function: createResponse()

> **createResponse**(`body`, `init`): `Response`

Defined in: [packages/proxy/src/utils/createResponse.ts:26](https://github.com/isdk/proxy.js/blob/ca0753e2e2dcac65190c537ce1634a27f5ee2158/src/utils/createResponse.ts#L26)

创建带 url 的 Web Response 实例，并确保其 clone() 方法能正常保留该 url

## Parameters

### body

`BodyInit` | `null`

### init

`ResponseInit` & `object`

## Returns

`Response`
