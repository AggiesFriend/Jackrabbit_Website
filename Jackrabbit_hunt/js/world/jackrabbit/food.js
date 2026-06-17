// Food: buying foodstuffs from the Food Hall vendors, and eating them before
// they go off. A small self-contained mechanic.
//
//  - BUY works in any food-selling room (NPC stall or self-service "honesty
//    scanner") — it charges the PC's ID balance and hands over an item.
//  - Each food has a freshness window (in ticks ≈ turns). Past it, food either
//    DEGRADES (cold/dry/congealed — unpleasant but edible) or SPOILS (wilted /
//    melted — inedible, binned on the attempt). Tunable per item below.
//  - EAT (also CONSUME / BITE) consumes a carried food and prints flavour that
//    depends on its freshness. The Bengali curry is, canonically, VERY spicy.
//
// Credits and affordability live in economy.ts now (balance / canAfford / charge
// / credit); this file just spends them on food.
import { takeItemToInventory, removeItem } from "../../engine/items.js";
import { addNote } from "../../engine/notes.js";
import { FLAG_BOUGHT_AT_CELESTE, HOOK_ATE_CURRY, HOOK_SURVIVED_CURRY, HOOK_SANDWICH_HE, HOOK_SANDWICH_JAM, } from "./flags.js";
import { score } from "./scoring.js";
import { balance, charge, canAfford } from "./economy.js";
/** Flag key recording the tick a given food was bought (drives freshness). */
const boughtKey = (id) => `food_bought_${id}`;
// --- the curry death (canonical: the curry is VERY spicy) ----------------
// Eating the Bengali curry is a telegraphed mischief death: the spice keeps
// climbing, and unless the PC eats an UNMELTED ice cream within the window, it
// kills them. (Horizon's justice is never lethal — but a five-alarm curry is.)
const SPICE_DEATH_AT = "spice_death_at";
const SPICE_DEATH_TURNS = 4; // ticks after eating curry before the spice is fatal
// Prices are canon-anchored: the apricot-jam sandwich is HALF A CREDIT, and the
// luxury end (a Burrito Céleste meal, not yet a purchasable) sits around 10.
// Everything in the Food Hall is cheap street food, well under that. Freshness
// windows remain tuning values. Starting balance is 500 credits.
const FOOD_DEFS = [
    {
        id: "burger", name: "burger", aliases: ["burger", "hank burger", "quarter-pounder", "half-pounder"],
        price: 3, freshTicks: 10, spoil: "degrades",
        descFresh: "A vast, dripping burger, still radiating griddle-heat. It smells, frankly, magnificent.",
        descStale: "The burger has gone cold and a little sad — the cheese set, the bun gone slightly damp. Edible. Joyless.",
        eatFresh: ["You demolish the burger. It is everything Hank promised and more. Worth flying anywhere for."],
        eatStale: ["You eat the cold burger. It is fuel, not pleasure — congealed and faintly reproachful. You finish it anyway."],
    },
    {
        id: "hank_special", name: "Hank Special", aliases: ["hank special", "special", "the hank special"],
        price: 5, freshTicks: 10, spoil: "degrades",
        descFresh: "The Hank Special: a burger of frankly irresponsible architecture, leaking three sauces and a confidence it has not earned.",
        descStale: "The Hank Special, gone cold, is a structural tragedy — the sauces congealed into geology. Still, in theory, food.",
        eatFresh: ["You attempt the Hank Special. It fights back. You win, narrowly, and regret nothing — though you would not, in fact, want to fly anywhere for an hour."],
        eatStale: ["You eat the cold Hank Special. The less said the better. It sits in you like ballast."],
    },
    {
        id: "sandwich", name: "sandwich", aliases: ["sandwich", "apricot sandwich", "jam sandwich", "cheese and pickle"],
        price: 0.5, freshTicks: 25, spoil: "degrades",
        descFresh: "A neat, immaculate sandwich on fresh white bread, cut on the diagonal exactly as advertised.",
        descStale: "The sandwich has dried at the edges, the bread curling up at the corners. Past its best, but it won't hurt you.",
        eatFresh: ["You eat the sandwich. Simple, fresh, and unexpectedly good. She knows her bread."],
        eatStale: ["You eat the curling, dried-out sandwich. It is technically a sandwich. The spirit has left it."],
    },
    {
        id: "salad", name: "salad", aliases: ["salad", "salad bowl", "bowl", "greens"],
        price: 2, freshTicks: 12, spoil: "spoils",
        descFresh: "A build-your-own bowl, the arboretum-grown greens improbably crisp and glistening.",
        descStale: "The salad has wilted to a warm, weeping sludge, the leaves gone translucent and sour. Not food any more.",
        eatFresh: ["You eat the salad. Crisp, clean, virtuous — you feel briefly superior to everyone eating Hank's burgers."],
        eatStale: ["You get one whiff of the wilted, sour salad and bin it. There's no eating that."],
    },
    {
        id: "curry", name: "curry", aliases: ["curry", "bengali", "bengali delights", "bowl of curry"],
        price: 3, freshTicks: 15, spoil: "degrades",
        descFresh: "A small steel bowl of curry, deep red and fragrant, with an oily sheen on top that should probably be read as a warning.",
        descStale: "The curry has gone cold and claggy, a skin formed over the top. The heat, you suspect, has not gone anywhere.",
        eatFresh: [
            "You take a confident mouthful of the curry.",
            "Time stops. Somewhere, very far away, you can hear a kettle. Your eyes water; your ears ring; the back of your skull "
                + "files a formal complaint. It is, underneath the inferno, genuinely delicious — but you would trade your contract, "
                + "right now, for a glass of milk. \"A little spicy,\" indeed.",
        ],
        eatStale: ["You eat the cold, claggy curry. The flavour has dulled; the heat, unforgivably, has not. You sweat through it grimly."],
    },
    {
        id: "ice_cream", name: "ice cream", aliases: ["ice cream", "ice-cream", "icecream", "cone", "scoop"],
        // Melts after 8 ticks — fast enough to feel the pressure, slow enough to
        // carry to Bengali Delights as a curry antidote (see SPICE_DEATH_TURNS).
        price: 1, freshTicks: 8, spoil: "spoils",
        descFresh: "A scoop of something an impossible colour, beading with cold under the hall's warm lights. Eat it quickly.",
        descStale: "The ice cream has surrendered — a warm, vivid puddle running over your fingers and down your wrist. Too late.",
        eatFresh: ["You eat the ice cream fast, before it can betray you. Cold, sweet, ridiculous. Exactly right."],
        eatStale: ["You're left holding a warm, sticky soup of melted ice cream. You wash it off your hand and write it off as a loss."],
    },
    {
        id: "celeste_meal", name: "Burrito Céleste", aliases: ["burrito", "burrito celeste", "burrito céleste", "wrap", "large wrap", "meal"],
        price: 10, freshTicks: 20, spoil: "degrades",
        descFresh: "A Burrito Céleste, wrapped tight and still warm, heavier than it has any right to be. The smell alone is a small event.",
        descStale: "The burrito has gone cool and the wrap a little stiff, though the smell still makes a strong case for itself.",
        eatFresh: ["You eat the Burrito Céleste slowly, the way it deserves. It is, without exaggeration, the best thing you have eaten in longer than you'd care to admit. Worth every one of its ten credits, and then some."],
        eatStale: ["You eat the cooled burrito. Even past its best it outclasses everything else on the station — but you can tell it was meant to be eaten warm, and you've cheated yourself a little."],
    },
    {
        id: "noodles", name: "bowl of noodles", aliases: ["noodles", "noodle", "noodle bowl", "bowl of noodles", "ramen", "broth"],
        price: 2, freshTicks: 12, spoil: "degrades",
        descFresh: "A steaming bowl of noodles in a fragrant, glistening broth. The smell alone was worth the trip down here.",
        descStale: "The noodles have swollen and gone claggy, the broth cooled to a greasy film. Edible, but the magic's gone.",
        eatFresh: ["You eat the noodles. The broth is rich, the noodles springy, and for a moment the whole grubby district is forgiven. The smell did not lie."],
        eatStale: ["You eat the cold, bloated noodles. They've drunk all their broth and turned to paste. The smell, at least, was honest."],
    },
    // --- drinks & street food (the wider-outpost sweep) ---
    {
        id: "fizzy_drink", name: "fizzy drink", aliases: ["fizzy drink", "drink", "soda", "pop", "fizzy", "cola", "soft drink"],
        price: 1, freshTicks: 15, spoil: "degrades",
        descFresh: "A tall cup of something violently coloured and aggressively carbonated, beads of cold sliding down the side.",
        descStale: "The fizzy drink has gone flat and tepid, the ice melted to a thin, sweet disappointment.",
        eatFresh: ["You drink it down — cold, sweet, and fizzing all the way. Precisely as nutritious as it looks, and just as satisfying."],
        eatStale: ["You drink the flat, warm dregs. Sugar without the joy. You finish it anyway, on principle."],
    },
    {
        id: "coffee", name: "coffee", aliases: ["coffee", "cup of coffee", "caffeine", "brew", "cup"],
        price: 1, freshTicks: 8, spoil: "degrades",
        descFresh: "A paper cup of coffee, the lid not quite straight, steam curling off the top.",
        descStale: "The coffee has gone stone cold, a skin forming on the surface. Drinkable, technically.",
        eatFresh: ["You drink the coffee. Hot, strong, and bracing — the world snaps a little more sharply into focus."],
        eatStale: ["You drink the cold coffee. It does the job, joylessly, and reminds you why you don't usually let it go cold."],
    },
    {
        id: "doughnut", name: "doughnut", aliases: ["doughnut", "donut", "ring", "sugar ring", "glazed ring"],
        price: 1, freshTicks: 25, spoil: "degrades",
        descFresh: "A warm glazed doughnut, the sugar still faintly molten, fragrant enough to be a public nuisance.",
        descStale: "The doughnut has gone cold and a little leathery, the glaze crusted over. Past its warm best.",
        eatFresh: ["You eat the doughnut in roughly four bites. Warm, sweet, faintly indecent. You consider a second and decide against it, narrowly."],
        eatStale: ["You eat the cold doughnut. The magic was in the warmth, and the warmth is gone — but sugar is sugar."],
    },
    {
        id: "hot_dog", name: "hot dog", aliases: ["hot dog", "hotdog", "dog", "sausage", "frankfurter"],
        price: 2, freshTicks: 10, spoil: "degrades",
        descFresh: "A hot dog in a soft bun, straight off the roller-grill and dressed with whatever you pointed at. Steam and onions.",
        descStale: "The hot dog has gone cold and the bun gone damp, the onions weeping quietly. Sad, but edible.",
        eatFresh: ["You eat the hot dog standing up, the only correct way. Greasy, salty, and completely satisfying."],
        eatStale: ["You eat the cold hot dog. It is a sequence of textures you'd rather not dwell on, but you finish it."],
    },
    {
        id: "snack", name: "hot snack", aliases: ["snack", "hot snack", "nachos", "pretzel", "chips", "fries"],
        price: 2, freshTicks: 10, spoil: "degrades",
        descFresh: "A cardboard tray of something hot, salty and aggressively moreish, built to be eaten one-handed between games.",
        descStale: "The snack has gone cold and limp, the salt no longer quite enough to redeem it.",
        eatFresh: ["You demolish the hot snack between one thought and the next. Salt, grease, and the particular pleasure of food you don't have to think about."],
        eatStale: ["You eat the cold snack. It has surrendered its one virtue, which was being hot. You finish it on momentum."],
    },
    {
        id: "diner_breakfast", name: "all-day breakfast", aliases: ["breakfast", "all-day breakfast", "fry-up", "fry up", "plate", "diner breakfast", "eggs"],
        price: 4, freshTicks: 12, spoil: "degrades",
        descFresh: "A vast all-day breakfast on a chipped plate — eggs, the works, and a heap of fried everything. The Stardust's finest, which is to say exactly what you want at this hour.",
        descStale: "The breakfast has congealed into a cold, glistening tableau. The yolks have set; the romance is over.",
        eatFresh: ["You eat the all-day breakfast with the single-minded focus it deserves. Greasy, enormous, and the most comforting thing on the station at four in the morning."],
        eatStale: ["You eat the cold breakfast. Congealed eggs are a test of character. You pass, barely."],
    },
    {
        id: "bar_drink", name: "drink", aliases: ["drink", "beer", "ale", "pint", "lager", "spirit", "round"],
        price: 3, freshTicks: 12, spoil: "degrades",
        descFresh: "A cold drink from the bar, condensation jewelling the glass.",
        descStale: "The drink has gone warm and flat, the head collapsed to a sad ring of foam.",
        eatFresh: ["You drink it slowly, letting the noise of the place wash over you. Pleasant enough, and exactly what the room is for."],
        eatStale: ["You finish the warm, flat drink without enthusiasm. It was better five minutes ago."],
    },
    {
        id: "cocktail", name: "cocktail", aliases: ["cocktail", "drink", "martini", "aperitif", "mixed drink"],
        price: 8, freshTicks: 10, spoil: "degrades",
        descFresh: "A small, exact cocktail in a chilled glass, garnished with the kind of precision that explains the price.",
        descStale: "The cocktail has warmed and separated, the garnish wilting over the rim. A waste of good spirits.",
        eatFresh: ["You sip the cocktail. Balanced, cold, and quietly expensive — the sort of drink that makes you sit up a little straighter."],
        eatStale: ["You drink the warm, separated cocktail. Whatever artistry went into it has long since left the glass."],
    },
    {
        id: "whisky", name: "whisky", aliases: ["whisky", "whiskey", "scotch", "dram", "drink", "single malt", "malt"],
        price: 9, freshTicks: 60, spoil: "degrades",
        descFresh: "A generous measure of amber whisky in a heavy crystal glass, a single perfect sphere of ice melting slowly within.",
        descStale: "The whisky sits warm and watery, the ice long gone. Still whisky; no longer a pleasure.",
        eatFresh: ["You drink the whisky slowly, the way the room insists you should. Smoke and warmth and a long, expensive finish."],
        eatStale: ["You drink the watered-down whisky. It's lost its edge, and so, frankly, have you for letting it sit."],
    },
];
const FOOD_BY_ID = Object.fromEntries(FOOD_DEFS.map(d => [d.id, d]));
/** "a" / "an" by the leading sound of the name (good enough for our menu). */
function article(name) {
    return /^[aeiou]/i.test(name.trim()) ? "an" : "a";
}
function matches(def, noun) {
    const n = noun.trim().toLowerCase();
    if (!n)
        return false;
    if (def.name.toLowerCase() === n || def.id === n)
        return true;
    return def.aliases.some(a => a === n || a.includes(n) || n.includes(a));
}
function isStale(s, def) {
    const bought = s.flags[boughtKey(def.id)];
    return typeof bought === "number" && s.ticks - bought > def.freshTicks;
}
const SANDWICH_FILLINGS = [
    { names: ["apricot", "apricot jam", "jam", "apricot-jam", "orange"], label: "apricot jam", apricot: true },
    { names: ["cheese", "cheese and pickle", "cheese & pickle", "pickle", "yellow"], label: "cheese & pickle" },
    { names: ["ham", "pink", "red"], label: "ham" },
    { names: ["corned beef", "beef", "corned-beef", "brown"], label: "corned beef" },
    { names: ["marmite", "yeast", "black"], label: "Marmite" },
];
const FILLING_LIST = SANDWICH_FILLINGS.map(f => f.label).join(", ");
function buySandwich(s, noun) {
    const def = FOOD_BY_ID["sandwich"];
    // Strip the word "sandwich(es)" to leave just the requested filling.
    const want = noun.replace(/sandwich(es)?/g, " ").replace(/\s+/g, " ").trim();
    if (!want) {
        return {
            handled: true,
            output: [`"What filling?" She gestures at the wall of photos — every sandwich the same but for the ` +
                    `colour between the slices. "I do ${FILLING_LIST}." (Try BUY APRICOT SANDWICH, and so on.)`],
            tickCost: 0, free: true,
        };
    }
    const filling = SANDWICH_FILLINGS.find(f => f.names.some(n => n === want || n.includes(want) || want.includes(n)));
    if (!filling) {
        return {
            handled: true,
            output: [`"I don't do that one, love." A nod at the photos. "${FILLING_LIST} — that's the lot."`],
            tickCost: 0, free: true,
        };
    }
    if (s.inventory.includes(def.id)) {
        return { handled: true, output: [`You've already got a sandwich; eat that one first.`], tickCost: 0, free: true };
    }
    if (!canAfford(s, def.price)) {
        return { handled: true, output: [`The sandwich is ${def.price} credits — you have ${balance(s)}.`], tickCost: 0, free: true };
    }
    charge(s, def.price);
    takeItemToInventory(s, def.id);
    s.flags[boughtKey(def.id)] = s.ticks;
    if (filling.apricot) {
        // The Nkosi path: the apricot-jam order draws out her fond, innocent leak.
        score(s, HOOK_SANDWICH_HE);
        score(s, HOOK_SANDWICH_JAM);
        return {
            handled: true,
            output: [
                `She reaches for the bread with a slight smile. "Apricot. Good choice." Neat, efficient hands — ` +
                    `and she slides a small bag across with your sandwich. "The Jackrabbit's favourite, that is — ` +
                    `haven't seen him in a few weeks, mind. Half a credit."`,
                `(Balance: ${balance(s)} credits.)`,
            ],
            tickCost: 1,
        };
    }
    return {
        handled: true,
        output: [
            `She builds your ${filling.label} sandwich in three deft moves, passes your ID over the reader ` +
                `(${def.price} credits), and wishes you well.`,
            `(Balance: ${balance(s)} credits.)`,
        ],
        tickCost: 1,
    };
}
const FOOD_STALLS = {
    horizon_hanks_burgers: {
        items: ["burger", "hank_special"],
        buyLine: (d) => `Hank assembles your ${d.name} with theatrical disregard for the flames, waves your ID past the reader — ${d.price} credits — and slides it over. "BEST ON THE STATION."`,
    },
    horizon_sandwich_counter: {
        items: ["sandwich"],
        // She asks which filling; the apricot-jam one is the easter egg (see buySandwich).
        customBuy: (s, noun) => buySandwich(s, noun),
    },
    horizon_fresh_salad_bowls: {
        items: ["salad"],
        // No NPC — the "honesty scanner" Charles asked for.
        buyLine: (d) => `There's no one serving here — just an HONESTY SCANNER beside a hand-lettered card: "Take what you like, scan to pay. We trust you." You scan your ID. ${d.price} credits. One ${d.name}, on your conscience.`,
    },
    horizon_bengali_delights: {
        items: ["curry"],
        buyLine: (d) => `The cook ladles you a ${d.name}, takes your ID payment with a serene nod (${d.price} credits), and adds, far too late to help, that it's "a little spicy."`,
    },
    horizon_ice_cream_hut: {
        items: ["ice_cream"],
        buyLine: (d) => `You scan your ID at the hut's reader — ${d.price} credits — and ${article(d.name)} ${d.name} is yours. The clock is now ticking.`,
    },
    lcd_noodle_counter: {
        items: ["noodles"],
        buyLine: (d) => `The cook ladles out a ${d.name} without once looking up, waves your ID past a greasy reader (${d.price} credits), and turns back to the pot.`,
    },
    cda_burrito: {
        items: ["celeste_meal"],
        // Buying here warms the server's Strand-1 beat (she's chattier with a customer).
        onBuy: (s, d) => {
            s.flags[FLAG_BOUGHT_AT_CELESTE] = true;
            return [`She wraps your ${d.name} with the brisk economy of long practice, passes your ID over the reader (${d.price} credits), and sets it in front of you. "There you are. Eat it warm."`];
        },
    },
    // --- Bazaar street stalls ---
    horizon_drinks_vendor: {
        items: ["fizzy_drink", "coffee"],
        buyLine: (d) => `The trader pulls you ${article(d.name)} ${d.name} from the chilled cabinet, waves your ID past a battered reader (${d.price} credits), and is already looking past you to the next customer.`,
    },
    horizon_doughnut_vendor: {
        items: ["doughnut"],
        buyLine: (d) => `A warm ${d.name} comes off the rack in a twist of paper; your ID pays the ${d.price} credits before you've quite finished inhaling.`,
    },
    horizon_hot_dog_vendor: {
        items: ["hot_dog"],
        buyLine: (d) => `"Onions? 'Course you do." The ${d.name} is built, dressed and handed over in one practised motion, your ID swiped for ${d.price} credits on the way past.`,
    },
    // --- Arcade (EZ2) ---
    ez2_refreshment: {
        items: ["fizzy_drink", "snack"],
        buyLine: (d) => `The counter kid slides ${article(d.name)} ${d.name} across without breaking off the conversation behind them; your ID pays the ${d.price} credits.`,
    },
    // --- Entertainment Zone 1 venues ---
    ez1_stardust_diner: {
        items: ["diner_breakfast", "coffee", "fizzy_drink"],
        buyLine: (d) => `A waitress with thirty years' practice sets ${article(d.name)} ${d.name} down in front of you, swipes your ID (${d.price} credits), and refills a coffee two booths over without looking.`,
    },
    ez1_velvet_hour: {
        items: ["cocktail"],
        buyLine: (d) => `The bartender builds your ${d.name} with unhurried, ruinous precision and sets it on a paper coaster. Your ID settles the ${d.price} credits without comment.`,
    },
    ez1_humidor: {
        items: ["whisky"],
        buyLine: (d) => `The attendant pours your ${d.name} from a bottle worth more than your boots and sets it down over a single sphere of ice. Your ID covers the ${d.price} credits.`,
        customBuy: (s, noun) => humidorBuy(s, noun),
    },
    ez1_eclipse: {
        items: ["bar_drink"],
        buyLine: (d) => `You shout an order across the long bar; somebody three-deep takes pity, and ${article(d.name)} ${d.name} eventually reaches you. Your ID pays the ${d.price} credits.`,
    },
    ez1_eclipse_vip: {
        items: ["cocktail"],
        buyLine: (d) => `A host materialises, builds your ${d.name} like it matters, and presents it on a small silver tray. ${d.price} credits — plus the unspoken cost of being seen to afford it.`,
    },
    ez1_midnight_revue: {
        items: ["bar_drink"],
        buyLine: (d) => `A server slips ${article(d.name)} ${d.name} onto your little shaded table between numbers, takes your ID for ${d.price} credits, and melts back into the dark.`,
    },
    ez1_last_laugh: {
        items: ["bar_drink"],
        buyLine: (d) => `Two-drink minimum, the sign warned, so you may as well start: ${article(d.name)} ${d.name}, ${d.price} credits off your ID, and a glare from the comic for the interruption.`,
    },
    // --- Celestial Dining: Meridian's raw bar (the others decline — see shops.ts) ---
    cda_unit_meridian: {
        items: ["cocktail"],
        buyLine: (d) => `The bartender slides your ${d.name} across the cold marble without a wasted motion. ${d.price} credits, quietly ruinous, and entirely worth it.`,
    },
    // --- Flight Training break room (self-service) ---
    training_break_room: {
        items: ["fizzy_drink", "coffee"],
        buyLine: (d) => `The drinks station dispenses ${article(d.name)} ${d.name} with a clunk and a hiss; you scan your ID for the ${d.price} credits, the way the trainees do between sims.`,
    },
};
// --- commands ------------------------------------------------------------
/** Complete a purchase of `def` from `stall` (charge, hand over, narrate).
 *  Shared by BUY and the honesty-stall SCAN-to-pay path. */
function purchase(s, stall, def) {
    if (s.inventory.includes(def.id)) {
        return { handled: true, output: [`You've already got ${article(def.name)} ${def.name}; eat that one first.`], tickCost: 0, free: true };
    }
    const bal = balance(s);
    if (!canAfford(s, def.price)) {
        return { handled: true, output: [`The ${def.name} costs ${def.price} credits — you have ${bal}.`], tickCost: 0, free: true };
    }
    charge(s, def.price);
    takeItemToInventory(s, def.id);
    s.flags[boughtKey(def.id)] = s.ticks;
    const lines = stall.onBuy
        ? stall.onBuy(s, def)
        : [stall.buyLine ? stall.buyLine(def) : `You scan your ID for ${article(def.name)} ${def.name} (${def.price} credits).`];
    return { handled: true, output: [...lines, `(Balance: ${balance(s)} credits.)`], tickCost: 1 };
}
/** The Humidor (EZ1): whisky is a normal carried drink; a cigar is bought and
 *  smoked on the spot (a charged, no-item indulgence — pure colour). */
const CIGAR_PRICE = 12;
function humidorBuy(s, noun) {
    if (/cigar|smoke|cigarette/.test(noun)) {
        if (!canAfford(s, CIGAR_PRICE)) {
            return { handled: true, output: [`A decent cigar here runs to ${CIGAR_PRICE} credits, and you're short. The attendant's eyebrow says the rest.`], tickCost: 0, free: true };
        }
        charge(s, CIGAR_PRICE);
        return {
            handled: true,
            output: [`The attendant selects a cigar from the wall, clips it, and offers a light. You smoke it slowly in one of the deep leather chairs — ${CIGAR_PRICE} credits well spent on doing nothing, expensively. (Balance: ${balance(s)} credits.)`],
            tickCost: 1,
        };
    }
    if (/whisky|whiskey|scotch|dram|drink|malt/.test(noun) || !noun) {
        return purchase(s, FOOD_STALLS["ez1_humidor"], FOOD_BY_ID["whisky"]);
    }
    return { handled: true, output: ["The Humidor runs to whisky and cigars. Try BUY WHISKY or BUY CIGAR."], tickCost: 0, free: true };
}
export const buyCmd = (_w, s, cmd) => {
    const noun = (cmd.noun ?? "").trim().toLowerCase();
    if (!noun)
        return { handled: true, output: ["Buy what?"], tickCost: 0, free: true };
    const stall = FOOD_STALLS[s.currentRoom];
    if (!stall)
        return { handled: true, output: ["There's nothing for sale here."], tickCost: 0, free: true };
    if (stall.customBuy)
        return stall.customBuy(s, noun);
    const def = stall.items.map(id => FOOD_BY_ID[id]).find(d => matches(d, noun));
    if (!def)
        return { handled: true, output: [`There's no ${noun} for sale here.`], tickCost: 0, free: true };
    return purchase(s, stall, def);
};
/**
 * SCAN-to-pay at a food stall — the honesty-box flow the salad bar's prose
 * promises ("scan and pay"). Returns a CommandResult if the current room is a
 * stall, else `undefined` so the generic `scan` handler can carry on to its
 * ID-reader logic. A single-item stall (the honesty scanner) buys that item
 * outright; a multi-item stall nudges toward BUY (you order from a person).
 */
/** True if the current room sells food (so SCAN can be offered as "scan to pay"). */
export function isFoodStallRoom(roomId) {
    return roomId in FOOD_STALLS;
}
/** BUY route: the food stalls (food/drink). Wired in index.ts. The same handler
 *  is also index.ts's fallback, so non-stall rooms still get its "nothing for
 *  sale here" reply. */
export const foodBuyRoute = {
    match: (s) => isFoodStallRoom(s.currentRoom),
    handler: buyCmd,
};
export function scanToPay(s) {
    const stall = FOOD_STALLS[s.currentRoom];
    if (!stall)
        return undefined;
    if (!s.inventory.includes("fake_id")) {
        return { handled: true, output: ["You have no ID card to scan."], tickCost: 0, free: true };
    }
    // A stall with its own purchase flow (the sandwich counter) handles scan-to-pay
    // itself — e.g. by asking which filling.
    if (stall.customBuy)
        return stall.customBuy(s, "");
    const defs = stall.items.map(id => FOOD_BY_ID[id]);
    if (defs.length === 1)
        return purchase(s, stall, defs[0]);
    const names = defs.map(d => d.name.toUpperCase());
    return {
        handled: true,
        output: [`There's more than one thing on offer here — say which: try BUY ${names.join(" or BUY ")}.`],
        tickCost: 0, free: true,
    };
}
const eatCmd = (_w, s, cmd) => {
    const noun = (cmd.noun ?? "").trim();
    if (!noun)
        return { handled: true, output: ["Eat what?"], tickCost: 0, free: true };
    const carried = FOOD_DEFS.find(d => s.inventory.includes(d.id) && matches(d, noun));
    if (!carried) {
        const known = FOOD_DEFS.find(d => matches(d, noun));
        if (known)
            return { handled: true, output: [`You don't have ${article(known.name)} ${known.name} to eat.`], tickCost: 0, free: true };
        return { handled: true, output: ["That's not something you can eat."], tickCost: 0, free: true };
    }
    const stale = isStale(s, carried);
    removeItem(s, carried.id);
    delete s.flags[boughtKey(carried.id)];
    const lines = [...(stale ? carried.eatStale : carried.eatFresh)];
    // Ice cream is the only antidote to the curry — but only if it hasn't melted.
    if (carried.id === "ice_cream" && s.flags[SPICE_DEATH_AT] !== undefined) {
        if (!stale) {
            delete s.flags[SPICE_DEATH_AT];
            score(s, HOOK_SURVIVED_CURRY);
            addNote(s, {
                id: "curry_survived",
                source: "You",
                text: "Survived the curry. The cure really is an unmelted ice cream — buy it first, eat the curry "
                    + "second, and don't dawdle in between. Noted, for the benefit of no one, since I am never doing "
                    + "that again.",
            });
            lines.push("", "The cold hits the fire like a fist. The inferno gutters, hisses, and dies. You sag against the "
                + "counter, eyes streaming, breathing again. Saved. By ice cream. You will never speak of this — "
                + "but you will, crucially, live to not speak of it.");
        }
        else {
            lines.push("", "Warm, melted ice cream against a five-alarm curry is no help to anyone. The fire roars on, "
                + "entirely unimpressed.");
        }
    }
    // Eating the curry starts the spice death clock. The sheer folly of it scores
    // (many points); a notepad entry records the predicament + the way out.
    if (carried.id === "curry") {
        s.flags[SPICE_DEATH_AT] = s.ticks;
        score(s, HOOK_ATE_CURRY);
        addNote(s, {
            id: "curry_dare",
            source: "You",
            text: "Ate the Bengali Delights curry. \"A little spicy\" is doing heroic work in that sentence — "
                + "the heat keeps climbing after the bowl's empty, and it does not stop on its own. The only thing "
                + "that touches it is cold: an ice cream, and only one that hasn't melted, and only if you're quick.",
        });
        lines.push("", "Then something turns. This isn't heat you can wait out — it's still climbing, and climbing fast. "
            + "You need something cold, NOW. Not a drink. Something properly cold. An ice cream, maybe — "
            + "if you've one to hand, and it hasn't melted.");
    }
    return { handled: true, output: lines, tickCost: 1 };
};
/**
 * World-clock fragment for the curry death. Telegraphs the rising spice for a
 * few ticks, then kills the PC if they haven't eaten an unmelted ice cream.
 * Eating the ice cream (in eatCmd) clears SPICE_DEATH_AT and defuses this.
 */
export function spiceTick(s) {
    if (s.dead || s.ended)
        return;
    const at = s.flags[SPICE_DEATH_AT];
    if (typeof at !== "number")
        return;
    const elapsed = s.ticks - at;
    if (elapsed >= SPICE_DEATH_TURNS) {
        delete s.flags[SPICE_DEATH_AT];
        s.dead = true;
        s.deathReason =
            "The spice wins. Your heart, gamely, does not. Somewhere on the far side of the roaring white "
                + "noise, a serene voice is saying it did warn you it was 'a little spicy'.\n\n"
                + "Cause of death: a bowl of curry from Bengali Delights, Horizon Outpost Food Hall.";
        return;
    }
    switch (elapsed) {
        case 1:
            return "The heat is still rising. Your eyes won't stop streaming. You need something COLD, and you needed it a moment ago.";
        case 2:
            return "Your whole skull is alight; thinking is becoming a struggle. Cold. An ice cream — if it hasn't melted — might just do it. Quickly.";
        case 3:
            return "You've lost the feeling in your face and the edges of your vision are whiting out. This is, you grasp dimly, genuinely about to kill you. Last chance.";
        default:
            return;
    }
}
export const foodCommands = {
    buy: buyCmd,
    eat: eatCmd, consume: eatCmd, bite: eatCmd,
    drink: eatCmd, sip: eatCmd, quaff: eatCmd,
};
// --- items ---------------------------------------------------------------
function makeFoodItem(def) {
    return {
        id: def.id,
        name: def.name,
        aliases: def.aliases,
        description: (s) => (isStale(s, def) ? def.descStale : def.descFresh),
        takeable: true,
    };
}
export const foodItems = Object.fromEntries(FOOD_DEFS.map(d => [d.id, makeFoodItem(d)]));
