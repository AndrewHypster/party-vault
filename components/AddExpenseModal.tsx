"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Loader2 } from "lucide-react";

interface AddExpenseModalProps {
  onAdd: (data: { title: string; amount: number; comment: string }) => Promise<void> | void;
}

export function AddExpenseModal({ onAdd }: AddExpenseModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || Number(amount) <= 0) return;

    try {
      setLoading(true);
      await onAdd({
        title: title.trim(),
        amount: Number(amount),
        comment: comment.trim(),
      });

      // Очищення та закриття модалки
      setTitle("");
      setAmount("");
      setComment("");
      setOpen(false);
    } catch (error) {
      console.error("Помилка при додаванні витрати:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <button className="flex items-center justify-center gap-2 p-3 sm:p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/85 hover:bg-zinc-800/80 active:scale-95 transition text-xs sm:text-sm font-semibold text-rose-400 shadow-sm w-full">
          <Receipt className="w-4 h-4" />
          Записати витрату
        </button>
      </DialogTrigger>

      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-sm rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-white">Записати витрату з каси</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          
          {/* Назва витрати */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              На що пішли гроші?
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Наприклад: Піца, Чіпси, Бензин"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-2xl focus-visible:ring-indigo-500"
              required
            />
          </div>

          {/* Сума */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Сума (₴)
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="1200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white text-lg font-bold h-12 rounded-2xl focus-visible:ring-indigo-500 pl-4 pr-8"
                required
                min="1"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₴</span>
            </div>
          </div>

          {/* Коментар / Деталі */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Коментар (деталі)
            </Label>
            <Input
              id="comment"
              type="text"
              placeholder="Наприклад: дві великі пепероні"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-2xl focus-visible:ring-indigo-500"
            />
          </div>

          {/* Кнопки */}
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
              disabled={loading || !title || !amount}
              className="flex-1 h-11 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Списати з каси"}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}