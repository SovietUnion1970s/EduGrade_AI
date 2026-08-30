"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // -1 means "not initialized yet" — prevents spurious toasts on first load
  const prevCountRef = useRef<number>(-1);

  const { data: notifications, refetch } = trpc.notification.list.useQuery(
    { unreadOnly: false },
    { refetchInterval: 5000 }
  );

  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => refetch()
  });

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => refetch()
  });

  const unreadCount = notifications?.meta?.unreadCount ?? 0;
  const allItems = notifications?.items ?? [];
  const unreadItems = allItems.filter(n => !n.isRead);

  useEffect(() => {
    // Skip the very first load (prevCountRef is still -1)
    if (prevCountRef.current === -1) {
      prevCountRef.current = unreadCount;
      return;
    }

    // Only show toast if unread count actually increased
    if (unreadCount > prevCountRef.current && unreadItems.length > 0) {
      const newNotif = unreadItems[0];
      toast.info(newNotif.title, {
        description: newNotif.body,
        duration: 6000,
        action: {
          label: "Xem ngay →",
          onClick: () => {
            const url = (newNotif as any).actionUrl;
            if (url) {
              router.push(url);
            } else {
              setIsOpen(true);
            }
          }
        }
      });
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]); // chỉ dep vào unreadCount, không dep vào unreadItems để tránh re-run liên tục

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors relative"
        title="Thông báo"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-[#0a0f1c]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[420px] bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
            <h3 className="font-bold text-sm text-white">
              Thông báo {unreadCount > 0 && <span className="text-brand-accent">({unreadCount} mới)</span>}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-brand-accent hover:text-indigo-400 font-medium flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {allItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Chưa có thông báo nào.</div>
            ) : (
              allItems.map((notif) => {
                const actionUrl = (notif as any).actionUrl as string | undefined;
                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl transition-colors ${
                      notif.isRead ? 'opacity-60 hover:bg-white/5' : 'bg-brand-accent/10 border border-brand-accent/20 hover:bg-brand-accent/20'
                    } ${actionUrl ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (!notif.isRead) markReadMutation.mutate({ id: notif.id });
                      if (actionUrl) {
                        setIsOpen(false);
                        router.push(actionUrl);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-sm leading-tight ${notif.isRead ? 'text-slate-300' : 'text-white font-bold'}`}>
                        {notif.title}
                      </h4>
                      {!notif.isRead && (
                        <span className="w-2 h-2 bg-brand-accent rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notif.body}</p>
                    {actionUrl && (
                      <p className="text-[10px] text-brand-accent/70 mt-1.5 font-medium">Nhấn để xem →</p>
                    )}
                    <span className="text-[10px] text-slate-600 block mt-1">
                      {new Date(notif.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}