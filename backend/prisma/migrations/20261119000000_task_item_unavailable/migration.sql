-- Отметка волонтёра «нет в наличии» у позиции списка покупок
ALTER TABLE "task_items" ADD COLUMN "is_unavailable" BOOLEAN NOT NULL DEFAULT false;
