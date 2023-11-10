export function errorResponse(data:any){
    return {
        statusCode: 400,
        body: JSON.stringify(data),
        headers: {
            "Access-Control-Allow-Origin": "*"
        }
    }
}

export function successResponse(data:any){
    return {
        statusCode: 200,
        body: JSON.stringify(data),
        headers: {
            "Access-Control-Allow-Origin": "*"
        }
    }
}