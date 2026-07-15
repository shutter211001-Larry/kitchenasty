async function testAnalytics() {
  const res = await fetch('http://localhost:3000/api/x8f9d2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'demo-tenant-id'
    },
    body: JSON.stringify({
      sessionId: 'sess_test',
      eventType: 'VIEW_MENU'
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
testAnalytics();
