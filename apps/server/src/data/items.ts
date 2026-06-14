export type ShopItem = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  priceGold?: number;
  priceAetherRaw: string;
  decimals: number;
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'founder_palette',
    name: 'Founder Palette',
    description: 'Cosmetic GameBoy palette. No gameplay advantage.',
    active: true,
    priceGold: 50,
    priceAetherRaw: '1000000',
    decimals: 6,
  },
  {
    id: 'frostlight_frame',
    name: 'Frostlight Frame',
    description: 'Cosmetic nameplate frame. No gameplay advantage.',
    active: true,
    priceGold: 80,
    priceAetherRaw: '2000000',
    decimals: 6,
  },
];

export function getShopItem(itemId: string) {
  return SHOP_ITEMS.find((item) => item.id === itemId && item.active);
}
