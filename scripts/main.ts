import * as mc from "@minecraft/server";

const ORES = new Set<string>([
    "minecraft:diamond_ore",
    "minecraft:deepslate_diamond_ore",
    "minecraft:iron_ore",
    "minecraft:deepslate_iron_ore",
    "minecraft:gold_ore",
    "minecraft:deepslate_gold_ore",
    "minecraft:coal_ore",
    "minecraft:deepslate_coal_ore",
    "minecraft:emerald_ore",
    "minecraft:deepslate_emerald_ore",
    "minecraft:ancient_debris",
    "minecraft:lapis_ore",
    "minecraft:deepslate_lapis_ore",
    "minecraft:redstone_ore",
    "minecraft:deepslate_redstone_ore",
    "minecraft:copper_ore",
    "minecraft:deepslate_copper_ore",
]);

const OFFSETS: mc.Vector3[] = [];
for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) {
        for (const dz of [-1, 0, 1]) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            OFFSETS.push({ x: dx, y: dy, z: dz });
        }
    }
}

function floodFill(dim: mc.Dimension, start: mc.Vector3, typeId: string, limit: number): mc.Vector3[] {
    const result: mc.Vector3[] = [];
    const visited = new Set<string>();
    const queue: mc.Vector3[] = [start];
    const key = (v: mc.Vector3): string => `${v.x},${v.y},${v.z}`;

    visited.add(key(start));

    while (queue.length > 0 && result.length < limit) {
        const current = queue.shift()!;
        result.push(current);

        for (const off of OFFSETS) {
            const next: mc.Vector3 = {
                x: current.x + off.x,
                y: current.y + off.y,
                z: current.z + off.z,
            };
            const k = key(next);
            if (visited.has(k)) continue;
            visited.add(k);
            const block = dim.getBlock(next);
            if (block?.typeId === typeId) {
                queue.push(next);
            }
        }
    }

    return result;
}

mc.world.afterEvents.playerBreakBlock.subscribe((ev: mc.PlayerBreakBlockAfterEvent): void => {
    const typeId: string = ev.brokenBlockPermutation.type.id;
    if (!ORES.has(typeId)) return;

    const player: mc.Player = ev.player;
    const dim: mc.Dimension = player.dimension;
    const pos: mc.Vector3 = ev.block.location;

    const blocks: mc.Vector3[] = floodFill(dim, pos, typeId, 32);

    mc.system.run((): void => {
        for (const bp of blocks) {
            const block = dim.getBlock(bp);
            if (!block || block.typeId !== typeId) continue;
            block.setType("minecraft:air");
            dim.spawnItem(
                new mc.ItemStack(typeId.replace("_ore", "").replace("minecraft:deepslate_", "minecraft:") + (typeId.includes("_ore") ? "" : ""), 1),
                { x: bp.x + 0.5, y: bp.y + 0.5, z: bp.z + 0.5 }
            );
        }
    });
});
