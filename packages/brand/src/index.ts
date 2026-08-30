/**
 * Product identity — the ONLY place the product's name appears in code.
 *
 * Renaming the product is one edit: change `PRODUCT` below. Nothing else in the
 * codebase needs to be touched, because nothing else hardcodes the name.
 *
 * WHY THIS PACKAGE EXISTS SEPARATELY
 *
 * Names change. They change after a trademark search, after someone finds the
 * .com is taken, or simply because a better one turns up. A name that has spread
 * into package scopes, import paths, storage keys and CSS classes is no longer one
 * edit — it is a week of grep, a broken deploy path, and a set of users whose
 * saved data has quietly vanished.
 *
 * So identity is split in three, and the split is the whole point:
 *
 *   BRAND       (this file)  user-facing, expected to change
 *   STRUCTURAL  (@app/*)     package names, deliberately brand-free, never change
 *   PERSISTENT  (below)      storage namespace, MUST never change
 *
 * The core knows nothing about any of this. `packages/core` is astronomy and
 * teaching; a rename must not be able to reach it. Lint enforces that: importing
 * this package from `packages/core` is a build error.
 */

export interface ProductIdentity {
  /** Displayed to users: window title, headers, install prompt. */
  readonly name: string;

  /**
   * Lowercase, hyphenated. For ids, CSS class prefixes and URL fragments.
   * NOT for storage keys — see `STORAGE_NAMESPACE`.
   */
  readonly slug: string;

  /**
   * The GitHub repository name, EXACTLY as GitHub spells it.
   *
   * GitHub Pages project paths are case-sensitive: a site served from
   * `/North-Star/` will not load from `/north-star/`, and the failure mode is a
   * blank page with a 404 on every asset — no error message, no clue. If the
   * repository is ever renamed, this is the field to change.
   */
  readonly repositoryName: string;

  /** One line, used as the meta description and the install subtitle. */
  readonly tagline: string;
}

export const PRODUCT: ProductIdentity = {
  name: 'North Star',
  slug: 'north-star',
  repositoryName: 'North-Star',
  tagline: 'Learn to read the sky. Measure it yourself, and find out how close you were.',
};

/**
 * Base path for GitHub Pages project hosting. Feed this to Vite's `base`.
 */
export const pagesBasePath = `/${PRODUCT.repositoryName}/`;

/**
 * Namespace for anything PERSISTED: localStorage, sessionStorage, IndexedDB,
 * and any future native store.
 *
 * DO NOT derive this from `PRODUCT`, and do not change it when the product is
 * renamed. Storage keys are a data migration, not a label. If this string
 * followed the brand, renaming the product would silently orphan every user's
 * saved calibration and progress — they would open the app to find their hand
 * calibration gone and no explanation for it.
 *
 * 'cnav' is short for celestial navigation. It is deliberately meaningless as a
 * brand, and that is what makes it safe.
 */
export const STORAGE_NAMESPACE = 'cnav';

/** Namespaced storage key, e.g. `storageKey('profile')` -> 'cnav:profile'. */
export const storageKey = (key: string): string => `${STORAGE_NAMESPACE}:${key}`;
