import { randomBytes } from "crypto";
import fetch from "node-fetch";
import { errorResponse, successResponse } from "./utils/lambda-response";
import ddb from "./utils/ddb";
import { generateApiKey } from "./generateApiKey";
import contributorsList from "./data/uniqueContributors.json";

const clientId = process.env.GH_CLIENT_ID || "";
const clientSecret = process.env.GH_CLIENT_SECRET || "";

async function exchangeCodeForAccessToken(code) {
  const clientId = "434392c1d50567bcc6a9";
  const clientSecret = "11e861b00b9722a78f8e9dddf01ee8f0e5689fb0";
  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("code", code);

  const res: any = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  }).then((response) => response.json());

  if (res.error) {
    throw new Error(res.error);
  }
  return res.access_token;
}

async function getGithubUser(accessToken) {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((r) => r.json());

  return res as { login: string };
}

const handler = async (event: AWSLambda.APIGatewayEvent) => {
  const { code, accessToken } = JSON.parse(event.body!);

  try {
    const token = accessToken ?? (await exchangeCodeForAccessToken(code));
    const user = await getGithubUser(token);
    const login = `github#${user.login}`;

    if (!contributorsList.includes(user.login)) {
      return successResponse({
        apiKey: null,
        token,
        login: user.login,
        isContributor: false,
      });
    }

    const loginKey = randomBytes(40).toString("base64url");
    await ddb.put({
      PK: `login#${loginKey}`,
      time: Date.now(),
      address: login,
    });

    const apikeyItem = await ddb.get({
      PK: `addressKey#${login}`,
    });

    const apiKey = apikeyItem.Item?.apiKey ?? null;

    if (apiKey) {
      return successResponse({
        apiKey,
        token,
        login: user.login,
        isContributor: true,
      });
    } else {
      const apiKey = await generateApiKey(login);
      return successResponse({
        apiKey,
        token,
        login: user.login,
        isContributor: true,
      });
    }
  } catch (e) {
    return errorResponse({ message: e.message });
  }
};

export default handler;
