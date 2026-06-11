import * as mc from "@minecraft/server";

interface CropData {
    seedId: string;
    matureAge: number;
}

const CROPS: Record<string, CropData> = {
    "minecraft:wheat":     { seedId: "minecraft:wheat_seeds", matureAge: 7 },
    "minecraft:carrots":   { seedId: "minecraft:carrot",      matureAge: 7 },
    "minecraft:potatoes":  { seedId: "minecraft:potato",      matureAge: 7 },
    "minecraft:beetroots": { seedId: "minecraft:beetroot_seeds", matureAge: 3 },
};

function findSeedSlot(container: mc.Container, seedId: string): number {
    for (let i = 0; i < container.size; i++) {
        const item: mc.ItemStack | undefined = container.getItem(i);
        if (item?.typeId === seedId) return i;
    }
    return -1;
}

function consumeSeed(container: mc.Container, slot: number): void {
    const item: mc.ItemStack = container.getItem(slot)!;
    if (item.amount > 1) {
        item.amount -= 1;
        container.setItem(slot, item);
    } else {
        container.setItem(slot, undefined);
    }
}

mc.world.afterEvents.playerBreakBlock.subscribe((ev: mc.PlayerBreakBlockAfterEvent): void => {
    const typeId: string = ev.brokenBlockPermutation.type.id;
    const crop: CropData | undefined = CROPS[typeId];
    if (!crop) return;

    const age: number = ev.brokenBlockPermutation.getState("age") as number;
    if (age < crop.matureAge) return;

    const inv = ev.player.getComponent("minecraft:inventory") as mc.EntityInventoryComponent | undefined;
    if (!inv?.container) return;

    const slot: number = findSeedSlot(inv.container, crop.seedId);
    if (slot === -1) return;

    consumeSeed(inv.container, slot);

    const pos: mc.Vector3 = ev.block.location;
    const dim: mc.Dimension = ev.player.dimension;
    const brokenPerm: mc.BlockPermutation = ev.brokenBlockPermutation;

    mc.system.run((): void => {
        const block: mc.Block | undefined = dim.getBlock(pos);
        if (!block) return;
        block.setPermutation(brokenPerm.withState("age", 0));
    });
});
