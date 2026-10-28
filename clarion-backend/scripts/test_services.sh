BASE=http://localhost:5001/api
J='Content-Type: application/json'
EMAIL="svc$RANDOM@test.com"
TOKEN=$(curl -s -X POST $BASE/auth/signup -H "$J" -d "{\"name\":\"Svc User\",\"email\":\"$EMAIL\",\"password\":\"Demo@12345\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))")
A="Authorization: Bearer $TOKEN"
bal() { curl -s $BASE/wallet -H "$A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('balance:',JSON.parse(d).data.balance))"; }
echo "--- start"; bal
echo "--- electricity bill 1850 (normal)"
curl -s -X POST $BASE/pay/service -H "$A" -H "$J" -d '{"productId":"electricity"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.data?j.data.outcome+' | '+j.data.txn.product+' | '+j.data.txn.id:j.error)})"
bal
echo "--- mobile 299 forced DUPLICATE"
curl -s -X POST $BASE/pay/service -H "$A" -H "$J" -d '{"productId":"mobile299","forceOutcome":"DUPLICATE"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.data?j.data.outcome+' | '+j.data.payments.length+' payments':j.error)})"
bal
echo "--- credit card bill 54999 (should fail: insufficient)"
curl -s -X POST $BASE/pay/service -H "$A" -H "$J" -d '{"productId":"cardbill"}'; echo
echo "--- top up 5000"
curl -s -X POST $BASE/wallet/topup -H "$A" -H "$J" -d '{"amount":5000}'; echo
bal
echo "--- send money via service (should be rejected)"
curl -s -X POST $BASE/pay/service -H "$A" -H "$J" -d '{"productId":"upi1000"}'; echo
echo "--- merchants list should have 4 shops, no billers"
curl -s $BASE/merchants | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.map(m=>m.name).join(', ')))"
