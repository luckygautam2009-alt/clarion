BASE=http://localhost:5001/api
EMAIL="demo$RANDOM@test.com"
echo "--- signup"
SIGNUP=$(curl -s -X POST $BASE/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"Demo User\",\"email\":\"$EMAIL\",\"password\":\"Demo@12345\"}")
echo $SIGNUP
TOKEN=$(echo $SIGNUP | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log((j.data&&j.data.token)||j.token||'')})")
echo "TOKEN=${TOKEN:0:12}..."
echo "--- wallet"
curl -s $BASE/wallet -H "Authorization: Bearer $TOKEN"
echo; echo "--- parse qr"
curl -s -X POST $BASE/qr/parse -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"raw":"upi://pay?pa=chaipoint@clarion&pn=Chai%20Point&am=150"}'
echo; echo "--- pay 150.13 (debited, not credited)"
curl -s -X POST $BASE/pay -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"upiId":"chaipoint@clarion","amount":150.13,"channel":"qr"}'
echo
