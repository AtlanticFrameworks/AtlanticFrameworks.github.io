import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Or explicitly set to "https://bwrp.net"
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { client_id, code, redirect_uri } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing authorization code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientSecret = Deno.env.get("ROBLOX_AUTH_SECRET");
    if (!clientSecret) {
      return new Response(JSON.stringify({ error: "Server missing Client Secret configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Exchange Code for Access Token
    const tokenOptions = new URLSearchParams();
    tokenOptions.append("client_id", client_id);
    tokenOptions.append("client_secret", clientSecret);
    tokenOptions.append("grant_type", "authorization_code");
    tokenOptions.append("code", code);
    tokenOptions.append("redirect_uri", redirect_uri || "https://bwrp.net/team");

    console.log("Sending token exchange request to Roblox...");
    const tokenResponse = await fetch("https://apis.roblox.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenOptions.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
        console.error("Token Exchange Error:", tokenData);
        return new Response(JSON.stringify({ error: "Token exchange failed", details: tokenData }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile Info using Access Token
    console.log("Fetching User Info from Roblox...");
    const userResponse = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
        console.error("Userinfo Fetch Error:", userData);
        return new Response(JSON.stringify({ error: "Failed to fetch userinfo", details: userData }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 3. Return user profile back to frontend
    return new Response(
      JSON.stringify(userData),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("Internal Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
