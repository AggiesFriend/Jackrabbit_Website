// Shops & wares — the BUY response for the outpost's NON-food retail: clothing,
// gadgets, the tattoo studio, the upscale restaurants, the LCD trades, and the
// civic facilities. None of these sell a carriable, useful item (the PC's economy
// is spend-only colour, and inventory clutter buys nothing), so BUY here is a
// characterful in-world reply rather than the flat "there's nothing for sale
// here." A few are nudges to TALK to a proprietor instead.
//
// Wired into the BUY router in index.ts AFTER the food stalls + bars: a room is
// either a food stall, a bar, Burke's bench, a shop here, or genuinely sells
// nothing. (Drinks/snacks/whisky/cigars live in food.ts; this is everything you
// can't eat.)
const SHOPS = {
    // --- Bazaar ---
    horizon_clothing_vendor: () => "The trader spreads a hand over the racks — practical station wear, a few louder pieces angled at " +
        "travellers with credits to burn. \"Try anything you like.\" Nothing here is anything you need, and the " +
        "prices are pitched at people with more leaving-money than you. You leave it.",
    // --- Dockside Retail ---
    horizon_clothing_emporium: () => "You browse the racks — womenswear, practical wear, footwear — but the only thing actually on offer at a " +
        "price worth naming is the Personal Shopper Service, a frankly criminal 100 credits an hour. You are not, " +
        "today, in the market for criminal.",
    horizon_gadget_shop: () => "Adaptors, chargers, novelty drones, travel gizmos of deeply suspect necessity — and, oddly, a " +
        "well-stocked corner of toys and games. Everything is better made than it has any right to be, and priced " +
        "to match. You pick a couple of things up, put them all down again, and buy nothing.",
    horizon_recycling_area: () => "The hoppers are for putting things IN, not taking them out — this is a recycling station, not a shop. " +
        "(Horizon takes its recycling very seriously; there's nothing here to buy.)",
    horizon_public_showers: () => "Everything civic on Horizon is free, the showers included. There's nothing to buy here — just SCAN your " +
        "ID at the turnstile and use a cubicle.",
    horizon_laundrette: () => "It's a laundrette, not a shop: the machines want your washing, not your custom. Nothing to buy here.",
    // --- Entertainment Zone 1 ---
    ez1_ink_and_iron: () => "\"Pick a design off the wall and I'll price it,\" an artist offers, nodding at the flash sheets. A tattoo " +
        "is one souvenir of Horizon you can't hand back, though — and not the one you came for. You decline, this " +
        "time.",
    // --- Celestial Dining: the three sit-down units (Meridian's bar sells drinks; see food.ts) ---
    cda_unit_orrery: () => "A maitre d' intercepts you with practised, regretful grace: The Orrery is tasting-menu only, by " +
        "reservation, and the price would make your contract weep. \"Perhaps another evening.\" You won't be " +
        "having another evening.",
    cda_unit_saffron: () => "The host glances at the bill of fare and then, fractionally, at you. Saffron & Ash is a sit-down affair " +
        "priced for people who never ask the price. You are not one of them, and you both know it.",
    cda_unit_long_table: () => "A seat at the Long Table means a long, expensive evening elbow-to-elbow with strangers — bookable, " +
        "ruinous, and not what you're here for. You leave the communal table to its communards.",
    // --- Lower Commercial District trades ---
    lcd_scrap_dealer: () => "Salvaged parts, cabling by the metre, components priced by weight rather than function — useful if you " +
        "were fixing a ship, which you are not. The dealer watches you not-buy with the patience of long habit.",
    lcd_supplement_vendor: () => "Tubs and sachets of powders, pressed bars promising the world and specifying nothing. You're neither " +
        "hungry enough nor gullible enough to start. (If it's actual food you want, the noodle counter's south.)",
    lcd_pawnshop: () => "The pawnbroker's window is a graveyard of other people's emergencies — tools, trinkets, the odd weathered " +
        "datapad. Nothing you need right now, though you note the place: the kind of shop that might, one quiet " +
        "day, sell you something the network never hears about.",
    lcd_rajah_front: () => "It's a pharmacy, not a help-yourself counter — medical supplies and consultations, over the counter. If " +
        "you need something here, TALK to Dr Rajah.",
    lcd_teng_brokerage: () => "Teng deals in ships, not over-the-counter sales: if you're buying here, you're buying a vessel, and that's " +
        "a conversation, not a transaction. TALK to him.",
};
/** True if the current room handles BUY with a wares reply (see SHOPS). */
export function isShopRoom(roomId) {
    return roomId in SHOPS;
}
/** BUY in a non-food shop — a characterful, free, in-world reply. */
export const shopBuyCmd = (_w, s, cmd) => {
    const reply = SHOPS[s.currentRoom];
    const out = reply
        ? reply(s, (cmd.noun ?? "").trim().toLowerCase())
        : "There's nothing for sale here.";
    return { handled: true, output: [out], tickCost: 0, free: true };
};
/** BUY route: the non-food shops (a wares reply). Wired in index.ts. */
export const shopBuyRoute = {
    match: (s) => isShopRoom(s.currentRoom),
    handler: shopBuyCmd,
};
