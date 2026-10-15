import type { Metadata } from 'next';
import { CartPlayer } from '@/components/cart/CartPlayer';

export const metadata: Metadata = {
  title: 'A PixiBun cart',
  description: 'A hand-made pixel drawing in a cart. Relight it with a lamp, watch it move, and keep it on your desk.',
};

export default function OpenCartPage() {
  return <CartPlayer />;
}
