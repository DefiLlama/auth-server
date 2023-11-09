export function errorResponse(data){
    return {
        statusCode: 400,
        body: JSON.stringify(data),
        headers: {
            "Access-Control-Allow-Origin": "*"
        }
    }
}

export function successResponse(data){
    return {
        statusCode: 200,
        body: JSON.stringify(data),
        headers: {
            "Access-Control-Allow-Origin": "*"
        }
    }
}