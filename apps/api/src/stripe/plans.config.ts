export const FREE_PLAN_LIMITS = {
    name: 'free',
    seatsLimit: 3,
    storageLimit: 1,
};

type PlanMeta = { plan: string; seatsLimit: number; storageLimit: number };

// Resuelve en runtime (cuando ya están cargadas las env vars)
function planByPriceId(priceId: string): PlanMeta | null {
    if (priceId === process.env.STRIPE_PRICE_PRO)
        return { plan: 'pro', seatsLimit: 25, storageLimit: 100 };
    if (priceId === process.env.STRIPE_PRICE_ENTERPRISE)
        return { plan: 'enterprise', seatsLimit: 100, storageLimit: 1000 };
    return null;
}

function planByProductId(productId: string): PlanMeta | null {
    if (productId === process.env.STRIPE_PRODUCT_PRO)
        return { plan: 'pro', seatsLimit: 25, storageLimit: 100 };
    if (productId === process.env.STRIPE_PRODUCT_ENTERPRISE)
        return { plan: 'enterprise', seatsLimit: 100, storageLimit: 1000 };
    return null;
}

export function getPlanConfig(priceId: string): PlanMeta {
    const config = planByPriceId(priceId);
    if (!config) throw new Error(`Plan desconocido para price: ${priceId}`);
    return config;
}

export function getPlanConfigByProductId(productId: string): PlanMeta {
    const config = planByProductId(productId);
    if (!config) throw new Error(`Plan desconocido para product: ${productId}`);
    return config;
}

// Registro price→product (ya no es necesario con lazy eval, pero lo mantenemos por compatibilidad)
export function registerPriceProduct(_priceId: string, _productId: string) {}
