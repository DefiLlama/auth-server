import { randomBytes } from "crypto";
import { errorResponse, successResponse } from "./utils/lambda-response";
import ddb from "./utils/ddb";
import { generateApiKey } from "./generateApiKey";

async function exchangeCodeForAccessToken(code) {
  const clientId = "434392c1d50567bcc6a9"; // TODO: move to env
  const clientSecret = "11e861b00b9722a78f8e9dddf01ee8f0e5689fb0"; // TODO: move to env;
  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("code", code);

  const res = await fetch("https://github.com/login/oauth/access_token", {
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

  return res;
}

const contributersList: string[] = []; // TODO: use real contributers list

const handler = async (event: AWSLambda.APIGatewayEvent) => {
  const code = event.queryStringParameters?.code!;
  const accessToken = event.queryStringParameters?.access_token!;

  try {
    const token = accessToken ?? (await exchangeCodeForAccessToken(code));
    const user = await getGithubUser(token);
    const login = `github#${user.login}`;

    if (contributersList.includes(user.login)) {
      return errorResponse({ message: "User is not a contributer" });
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
      return successResponse({ apiKey, token });
    } else {
      const apiKey = await generateApiKey(login);
      return successResponse({ apiKey, token });
    }
  } catch (e) {
    return errorResponse({ message: e.message });
  }
};

export default handler;
