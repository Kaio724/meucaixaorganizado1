const http = require('http');

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resBody) });
        } catch {
          resolve({ status: res.statusCode, raw: resBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method: 'GET'
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resBody) });
        } catch {
          resolve({ status: res.statusCode, raw: resBody });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- TEST 1: Logging hire intent ---');
  const hireRes = await post('/api/trial/hire-intent', {
    planName: 'MCO Completo',
    userEmail: 'test_user@example.com'
  });
  console.log('Hire intent response:', hireRes);
  if (hireRes.status !== 200 || !hireRes.body.success) {
    throw new Error('Failed to log hire intent');
  }

  console.log('--- TEST 2: Safeguard against deleting admin account ---');
  const adminDelRes = await post('/api/trial/delete-account', {
    userId: 'admin_123',
    email: 'kaiopatrick42@gmail.com'
  });
  console.log('Admin delete attempt response:', adminDelRes);
  if (adminDelRes.status !== 403) {
    throw new Error(`Expected 403 when trying to delete admin account, got ${adminDelRes.status}`);
  }

  console.log('--- TEST 3: Safeguard against deleting promo account ---');
  const promoDelRes = await post('/api/trial/delete-account', {
    userId: 'promo_123',
    email: 'contatogmtec@gmail.com'
  });
  console.log('Promo delete attempt response:', promoDelRes);
  if (promoDelRes.status !== 403) {
    throw new Error(`Expected 403 when trying to delete promo account, got ${promoDelRes.status}`);
  }

  console.log('--- TEST 4: Safeguard against deleting non-trial account ---');
  const nonTrialDelRes = await post('/api/trial/delete-account', {
    userId: 'regular_user_id',
    email: 'random_non_trial_user@domain.com'
  });
  console.log('Non-trial delete attempt response:', nonTrialDelRes);
  if (nonTrialDelRes.status !== 403) {
    throw new Error(`Expected 403 for non-expired trial deletion, got ${nonTrialDelRes.status}`);
  }

  console.log('--- TEST 5: Grant trial via admin endpoint and simulate expired deletion ---');
  const testEmail = 'tester_expiring_account@mco.test';
  
  // 1. Grant 1 minute trial
  const grantRes = await post('/api/trial/admin/action', {
    adminId: 'admin_123',
    adminEmail: 'kaiopatrick42@gmail.com',
    action: 'grant',
    targetEmail: testEmail,
    durationMinutes: 1
  });
  console.log('Grant response:', grantRes);
  if (!grantRes.body.success) {
    throw new Error('Failed to grant trial: ' + JSON.stringify(grantRes));
  }

  // 2. Start trial by querying status (first access)
  const startRes = await get(`/api/trial/status?userId=test_user_777&email=${encodeURIComponent(testEmail)}`);
  console.log('First access status response (started):', startRes.body.status);
  if (startRes.body.status !== 'active') {
    throw new Error('Expected active trial on first access, got: ' + startRes.body.status);
  }

  // 3. Manually advance trial expiration in cache to test expiration and deletion
  const fs = require('fs');
  const path = require('path');
  const trialsPath = path.join(process.cwd(), '.trials_cache.json');
  const store = JSON.parse(fs.readFileSync(trialsPath, 'utf8'));
  const now = new Date();
  store.trials[testEmail].expires_at = new Date(now.getTime() - 10000).toISOString();
  store.trials[testEmail].status = 'expired';
  fs.writeFileSync(trialsPath, JSON.stringify(store, null, 2), 'utf8');

  // Verify server reports expired
  const expiredRes = await get(`/api/trial/status?userId=test_user_777&email=${encodeURIComponent(testEmail)}`);
  console.log('Expired trial status check:', expiredRes.body.status);
  if (expiredRes.body.status !== 'expired') {
    throw new Error('Expected expired status, got ' + expiredRes.body.status);
  }

  // 4. Request account deletion
  const deleteRes = await post('/api/trial/delete-account', {
    userId: 'test_user_777',
    email: testEmail
  });
  console.log('Delete trial account response:', deleteRes);
  if (deleteRes.status !== 200 || !deleteRes.body.success) {
    throw new Error('Failed to delete expired trial account: ' + JSON.stringify(deleteRes));
  }

  console.log('--- TEST 6: Verify expired trial user cannot access /api/ai-reports/chat ---');
  // Kaiopatrick's trial is expired in cache, but Kaio is admin so he bypasses.
  // For another expired trial user, e.g. let's check with an expired email:
  const expiredEmail = 'aparecidasantos_expired@mco.test';
  await post('/api/trial/admin/action', {
    adminId: 'admin_123',
    adminEmail: 'kaiopatrick42@gmail.com',
    action: 'grant',
    targetEmail: expiredEmail,
    durationMinutes: 1
  });
  const store2 = JSON.parse(fs.readFileSync(trialsPath, 'utf8'));
  store2.trials[expiredEmail].status = 'expired';
  store2.trials[expiredEmail].expires_at = new Date(Date.now() - 50000).toISOString();
  fs.writeFileSync(trialsPath, JSON.stringify(store2, null, 2), 'utf8');

  const chatBlockRes = await post('/api/ai-reports/chat', {
    message: 'Faça um resumo financeiro',
    accountType: 'empresarial',
    userEmail: expiredEmail
  });
  console.log('Chat access for expired trial user response status:', chatBlockRes.status);
  if (chatBlockRes.status !== 403) {
    throw new Error(`Expected 403 for expired trial chat access, got ${chatBlockRes.status}`);
  }
  console.log('Chat guard verified: expired trial accounts are strictly blocked with 403 Forbidden!');

  // Cleanup test accounts
  const finalStore = JSON.parse(fs.readFileSync(trialsPath, 'utf8'));
  delete finalStore.trials[testEmail];
  delete finalStore.trials[expiredEmail];
  fs.writeFileSync(trialsPath, JSON.stringify(finalStore, null, 2), 'utf8');

  console.log('\n========================================');
  console.log('🎉 ALL INTEGRATION & SECURITY TESTS PASSED!');
  console.log('========================================');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
