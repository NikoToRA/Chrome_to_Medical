module.exports = async function (context, req) {
    context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() })
    };
};
