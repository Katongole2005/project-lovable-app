import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// This VAPID public key must match the one on the server
// Generate a pair at: https://vapidkeys.com/
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushStatus = "idle" | "loading" | "subscribed" | "denied" | "unsupported";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("idle");

  const saveSubscription = async (subscription: PushSubscription) => {
    const sub = subscription.toJSON();
    const keys = sub.keys as { p256dh?: string; auth?: string } | undefined;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId) {
      throw new Error("Please sign in before enabling notifications.");
    }

    if (!sub.endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error("Browser did not return a valid push subscription.");
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_id: userId,
      },
      { onConflict: "endpoint" }
    );

    if (error) throw error;
  };

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      console.error("VITE_VAPID_PUBLIC_KEY is not set");
      setStatus("unsupported");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") {
      setStatus("denied");
    } else if (perm === "granted") {
      // Check if actually subscribed, then make sure Supabase also has the row.
      navigator.serviceWorker.ready.then((reg: any) => {
        reg.pushManager.getSubscription().then(async (sub: PushSubscription | null) => {
          if (!sub) {
            setStatus("idle");
            return;
          }

          try {
            await saveSubscription(sub);
            setStatus("subscribed");
          } catch (err) {
            console.error("Push subscription sync error:", err);
            setStatus("idle");
          }
        });
      });
    }
  }, []);

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error("VITE_VAPID_PUBLIC_KEY is not set");
      return;
    }

    setStatus("loading");
    try {
      const reg: any = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await saveSubscription(subscription);

      setStatus("subscribed");
    } catch (err) {
      console.error("Push subscription error:", err);
      setStatus("idle");
    }
  };

  const unsubscribe = async () => {
    try {
      const reg: any = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("idle");
    } catch (err) {
      console.error("Unsubscribe error:", err);
    }
  };

  return { status, subscribe, unsubscribe };
}
