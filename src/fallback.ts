import { errorResponse, successResponse } from "./utils/lambda-response";

const handler = async (
  event: AWSLambda.APIGatewayEvent
) => {
  const response = event.httpMethod === "OPTIONS"? successResponse({}) : errorResponse({
    message: "This endpoint doesn't exist",
  } as any);
  response.headers["Cache-Control"] = `max-age=${3600}`; // 1hr
  response.headers["Access-Control-Allow-Headers"] = "*"

  return response;
};

export default handler;