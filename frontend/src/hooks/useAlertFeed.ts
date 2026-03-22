// 'use client';

// import { useEffect, useRef } from 'react';
// import toast from 'react-hot-toast';
// import { queryClient } from '@/api/queryClient';
// import { alertKeys } from '@/api/alerts.queries';
// import type { AlertEvent } from '@/types';

// function scoreColor(s: number) {
//   if (s >= 0.7) return '#ff3d5a';
//   if (s >= 0.4) return '#f59e0b';
//   return '#10b981';
// }

// export function useAlertFeed() {
//   const wsRef = useRef<WebSocket | null>(null);

//   useEffect(() => {
//     function connect() {
//       const token =
//         typeof document !== 'undefined'
//           ? document.cookie
//               .split('; ')
//               .find((c) => c.startsWith('anomanet_token='))
//               ?.split('=')[1] ?? ''
//           : '';

//       const ws = new WebSocket(
//         `ws://${window.location.host}/ws/alerts?token=${token}`
//       );
//       wsRef.current = ws;

//       ws.onmessage = (event) => {
//         try {
//           const alert: AlertEvent = JSON.parse(event.data);

//           // Prepend to React Query alerts cache
//           queryClient.setQueryData(alertKeys.all, (old: AlertEvent[] = []) => [
//             alert,
//             ...old,
//           ]);

//           // Invalidate list queries so they refetch
//           queryClient.invalidateQueries({ queryKey: alertKeys.all });

//           // Toast notification
//           toast.custom(
//             () => (
//               <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
//                 style={{
//                   background: '#121829',
//                   borderColor: 'rgba(82,108,255,0.25)',
//                   fontFamily: 'Figtree, sans-serif',
//                 }}>
//                 <span
//                   className="text-xs font-mono font-bold px-2 py-0.5 rounded"
//                   style={{
//                     background: `${scoreColor(alert.anoma_score)}22`,
//                     color: scoreColor(alert.anoma_score),
//                     border: `1px solid ${scoreColor(alert.anoma_score)}44`,
//                   }}
//                 >
//                   {alert.anoma_score.toFixed(2)}
//                 </span>
//                 <div>
//                   <p className="text-sm font-medium text-white">New Alert — {alert.account_id}</p>
//                   <p className="text-xs text-gray-400">{alert.detected_patterns.join(', ')}</p>
//                 </div>
//               </div>
//             ),
//             { duration: 5000 }
//           );
//         } catch {}
//       };

//       ws.onclose = () => {
//         setTimeout(connect, 3000); // reconnect
//       };
//     }

//     connect();
//     return () => wsRef.current?.close();
//   }, []);
// }

'use client';

import { useEffect } from 'react';

// DEV MODE — WebSocket disabled until backend is connected.
// The AlertFeed component uses its own mock data instead.
export function useAlertFeed() {
  useEffect(() => {
    // no-op in dev mode
  }, []);
}