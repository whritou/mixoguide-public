/**
 * Creates a pair of mapper functions (mapOne + mapMany) from a transform function.
 * The transform receives the raw DTO and a `n` helper that converts null → undefined.
 *
 * Usage:
 * ```
 * const [mapGlass, mapGlasses] = createMapper<GlassDTO, GlassEntity>((dto, n) => ({
 *   id:            dto.id,
 *   name:          dto.name,
 *   description:   n(dto.description),
 *   imageUrl:      n(dto.imageUrl),
 * }))
 * ```
 */
export function createMapper<DTO, Entity>(
    transform: (dto: DTO, n: <T>(val: T | null | undefined) => T | undefined) => Entity,
): [(dto: DTO) => Entity, (dtos: DTO[]) => Entity[]] {
    /** Convert null/undefined → undefined */
    const n = <T>(val: T | null | undefined): T | undefined =>
        val === null || val === undefined ? undefined : val

    const mapOne  = (dto: DTO): Entity => transform(dto, n)
    const mapMany = (dtos: DTO[]): Entity[] => dtos.map(mapOne)

    return [mapOne, mapMany]
}
