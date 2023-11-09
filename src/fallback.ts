import { errorResponse } from "./utils/lambda-response";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
) => {
  const response = errorResponse({
    message: "This endpoint doesn't exist",
  } as any);
  response.headers["Cache-Control"] = `max-age=${3600}`; // 1hr

  return response;
};

export default handler;