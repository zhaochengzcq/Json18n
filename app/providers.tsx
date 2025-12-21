// app/providers.tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only', // 节省资源，只在用户登录后才合并画像
    capture_pageview: false, // 后面我们手动接管，或者设为 true 自动采集
    // 开启录屏 (Session Replay)
    session_recording: {
      maskAllInputs: false, // 设为 false 以便看到用户输入的 JSON (注意隐私！)
      maskInputOptions: {
        password: true, // 永远隐藏密码字段
      }
    } 
  })
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}