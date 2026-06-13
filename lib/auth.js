function getProvidedSecret(request, body = {}) {
  const header = request.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  return bearer || body.secret || null;
}

function isTestAuthorized(request, body = {}) {
  const expected = process.env.TEST_API_SECRET;
  if (!expected) {
    return false;
  }

  return getProvidedSecret(request, body) === expected;
}

module.exports = {
  getProvidedSecret,
  isTestAuthorized,
};
