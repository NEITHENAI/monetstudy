const BASE = process.env.PESAPAL_BASE_URL!;

// ─── AUTH TOKEN ────────────────────────────────────────────────────
// Pesapal v3 requires a Bearer token for every API call.
// Tokens expire after 5 minutes — we cache it in memory per instance.

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPesapalToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!res.ok) throw new Error(`Pesapal auth failed: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('No token in Pesapal auth response');

  // Cache for 4.5 minutes (token lasts 5 min)
  cachedToken = { token: data.token, expiresAt: Date.now() + 4.5 * 60 * 1000 };
  return data.token;
}

// ─── REGISTER IPN ──────────────────────────────────────────────────
// IPN = Instant Payment Notification URL. Must be registered once.
// Returns an ipn_id to attach to orders.

export async function registerIPN(): Promise<string> {
  const token = await getPesapalToken();
  const ipnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/pesapal-ipn`;

  const res = await fetch(`${BASE}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'POST',
    }),
  });

  if (!res.ok) throw new Error(`IPN registration failed: ${res.status}`);
  const data = await res.json();
  return data.ipn_id as string;
}

// ─── SUBMIT ORDER ──────────────────────────────────────────────────
export interface PesapalOrderParams {
  id: string;           // our unique tx ref
  amount: number;
  currency: string;     // 'UGX', 'USD', etc.
  description: string;
  email: string;
  firstName: string;
  lastName: string;
  ipnId: string;
  callbackUrl: string;
}

export interface PesapalOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;   // the iframe src
}

export async function submitOrder(params: PesapalOrderParams): Promise<PesapalOrderResponse> {
  const token = await getPesapalToken();

  const res = await fetch(`${BASE}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: params.id,
      currency: params.currency,
      amount: params.amount,
      description: params.description,
      callback_url: params.callbackUrl,
      notification_id: params.ipnId,
      billing_address: {
        email_address: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pesapal order failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Pesapal order error');

  return {
    order_tracking_id: data.order_tracking_id,
    merchant_reference: data.merchant_reference,
    redirect_url: data.redirect_url,
  };
}

// ─── GET TRANSACTION STATUS ────────────────────────────────────────
export async function getTransactionStatus(orderTrackingId: string) {
  const token = await getPesapalToken();

  const res = await fetch(
    `${BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
  return res.json();
}
