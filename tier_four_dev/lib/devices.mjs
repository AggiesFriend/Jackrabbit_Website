// The device matrix from the development process, used by the layout sweep.
// Widths under 768 are emulated as touch phones.
export const DEVICES = [
    { name: 'smallest-320', width: 320, height: 568, phone: true },
    { name: 'design-360', width: 360, height: 640, phone: true },
    { name: 'small-iphone-375', width: 375, height: 667, phone: true },
    { name: 'standard-phone-390', width: 390, height: 844, phone: true },
    { name: 'large-android-412', width: 412, height: 915, phone: true },
    { name: 'tablet-768', width: 768, height: 1024, phone: false },
    { name: 'desktop-1280', width: 1280, height: 800, phone: false },
];

// Pages the sweep visits, relative to the site root.
export const PAGES = ['/tier_four/'];
