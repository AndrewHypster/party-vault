"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Banknote, CreditCard, Loader2 } from "lucide-react";

interface AddContributionModalProps {
  onAdd: (data: { amount: number; comment: string; isCash: boolean }) => Promise<void> | void;
}

export function AddContributionModal({ onAdd }: AddContributionModalProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [isCash, setIsCash] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    try {
      setLoading(true);
      await onAdd({
        amount: Number(amount),
        comment: comment.trim(),
        isCash,
      });

      // Очищення та закриття модалки
      setAmount("");
      setComment("");
      setIsCash(false);
      setOpen(false);
    } catch (error) {
      console.error("Помилка при додаванні внеску:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <button className="flex items-center justify-center gap-2 p-3 sm:p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/85 hover:bg-zinc-800/80 active:scale-95 transition text-xs sm:text-sm font-semibold text-emerald-400 shadow-sm w-full">
          <Plus className="w-4 h-4" />
          Додати внесок
        </button>
      </DialogTrigger>

      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-sm rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-white">Додати внесок у касу</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          
          {/* Сума */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Сума (₴)
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white text-lg font-bold h-12 rounded-2xl focus-visible:ring-indigo-500 pl-4 pr-8"
                required
                min="1"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₴</span>
            </div>
          </div>

          {/* Тип оплати: Готівка чи Карта */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Спосіб внесення</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCash(false)}
                className={`flex items-center justify-center gap-2 h-11 rounded-2xl border text-xs font-semibold transition ${
                  !isCash 
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-400" 
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                На карту
              </button>
              <button
                type="button"
                onClick={() => setIsCash(true)}
                className={`flex items-center justify-center gap-2 h-11 rounded-2xl border text-xs font-semibold transition ${
                  isCash 
                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-400" 
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60"
                }`}
              >
                <Banknote className="w-4 h-4" />
                Готівка
              </button>
            </div>
          </div>

          {/* Коментар */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Коментар (необов&apos;язково)
            </Label>
            <Input
              id="comment"
              type="text"
              placeholder="Наприклад: за квітень"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-2xl focus-visible:ring-indigo-500"
            />
          </div>

          {/* Кнопки збереження */}
          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="flex-1 h-11 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              disabled={loading || !amount}
              className="flex-1 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Зберегти"}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}