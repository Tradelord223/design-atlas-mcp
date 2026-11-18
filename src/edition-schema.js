import { readingIconNames } from './atlas-spread-icons.js';
import * as z from 'zod';
import { editionLimits as limit } from './image-atlas.js';

const text = size => z.string().trim().min(1).max(size);
const id = text(limit.id).regex(/^[a-z][a-z0-9-]*$/);
const url = text(limit.url).describe('Absolute HTTPS URL.');
const image = z.strictObject({src:text(limit.embeddedImage).describe('Absolute HTTPS image URL or embedded base64 JPEG, PNG or WebP.'),alt:text(limit.alt)});
const percent = z.number().min(0).max(100).describe('Percent of the cover image measured from its top-left corner.');
export const editionShape = {
  brand:text(limit.brand), edition:text(limit.edition), headline:text(limit.headline), deck:text(limit.deck),
  date:text(limit.date), accent:text(7).regex(/^#[a-f0-9]{6}$/i), image,
  theme:z.strictObject({paper:text(7),ink:text(7),display:z.enum(['sans','serif'])}).optional().describe('Brand paper, ink and display type. Paper/ink need 4.5:1 contrast.'),
  readings:z.array(z.strictObject({id,icon:z.enum(readingIconNames).optional(),label:text(limit.label),value:text(limit.value),title:text(limit.title),body:text(limit.readingBody),x:percent,y:percent})).min(1).max(limit.count),
  chapters:z.array(z.strictObject({id,kicker:text(limit.kicker),title:text(limit.title),body:text(limit.chapterBody),image})).min(1).max(limit.count),
  sourceUrl:url, sourceLabel:text(limit.sourceLabel)
};
