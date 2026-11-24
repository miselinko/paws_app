import React, { useMemo } from 'react'
import { Platform, View } from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'

/** Javni ključ (nije tajna). Bez njega CAPTCHA se ne prikazuje. */
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? ''
// Turnstile proverava hostname stranice; mora biti dozvoljen u Cloudflare podešavanjima widgeta.
const BASE_URL = process.env.EXPO_PUBLIC_TURNSTILE_BASE_URL ?? 'https://paws-app-seven.vercel.app'

/** Cloudflare Turnstile u WebView-u za registraciju u aplikaciji. */
export default function TurnstileWebView({ onToken, resetKey = 0 }: { onToken: (t: string) => void; resetKey?: number }) {
  const html = useMemo(() => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onLoad&render=explicit" async defer></script>
<style>html,body{margin:0;background:transparent;display:flex;justify-content:center}</style>
</head><body><div id="w"></div><script>
function send(t){window.ReactNativeWebView.postMessage(t||'')}
function onLoad(){turnstile.render('#w',{sitekey:${JSON.stringify(TURNSTILE_SITE_KEY)},language:'sr',
callback:send,'expired-callback':function(){send('')},'error-callback':function(){send('')}})}
</script></body></html>`, [])

  if (!TURNSTILE_SITE_KEY || Platform.OS === 'web') return null
  return (
    <View style={{ height: 72, marginTop: 8 }}>
      <WebView
        key={resetKey}
        originWhitelist={['*']}
        source={{ html, baseUrl: BASE_URL }}
        onMessage={(e: WebViewMessageEvent) => onToken(e.nativeEvent.data)}
        javaScriptEnabled
        scrollEnabled={false}
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  )
}
