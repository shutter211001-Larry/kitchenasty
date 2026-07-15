async function testFunnel() {
  const res = await fetch('http://localhost:3000/api/b3k1s', {
    method: 'GET',
    headers: {
      'x-tenant-id': 'demo-tenant-id'
    }
  });
  console.log(res.status);
  console.log(await res.text());
}
testFunnel();
