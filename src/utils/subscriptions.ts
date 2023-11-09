import fetch from "node-fetch";
import { minAmount, toAddress } from "./constants";

export function isSubscribed(userAddress: string) {
    return fetch("https://api.thegraph.com/subgraphs/name/0xngmi/llamasubs-optimism", {
        method: "post",
        body: JSON.stringify({
            query: `
  query Subs($now: BigInt, $userAddress: Bytes, $receiver: Bytes, $minAmountPerCycle:BigInt) {
    subs(
      where: {owner: $userAddress, startTimestamp_lt: $now, realExpiration_gte: $now, receiver: $receiver, amountPerCycle_gte: $minAmountPerCycle}
    ) {
      startTimestamp
      realExpiration
    }
  }`,
            variables: {
                now: Math.floor(Date.now() / 1e3),
                userAddress,
                receiver: toAddress,
                minAmountPerCycle: minAmount.toString()
            }
        })
    }).then(r => r.json()).then((r:any) => r.data.subs.length > 0)
}