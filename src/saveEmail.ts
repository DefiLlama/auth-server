import ddb from "./utils/ddb";
import { errorResponse, successResponse } from "./utils/lambda-response";

const handler = async (event: AWSLambda.APIGatewayEvent) => {
  const email = JSON.parse(event.body!).email;
  const signedIn = await ddb.get({
    PK: `login#${event.headers.Authorization}`,
  });
  if (!signedIn.Item) {
    return errorResponse({ message: "bad signature" });
  }
  const address = signedIn.Item.address.toLowerCase();
  const prevEmail = await ddb.get({
    PK: `email#${address}`,
  });
  if (prevEmail.Item) {
    await ddb.delete({
      Key: {
        PK: `email#${address}`,
      },
    });
  }
  await ddb.put({
    PK: `email#${address}`,
    email,
    time: Date.now(),
  });

  return successResponse({ email });
};

export default handler;
