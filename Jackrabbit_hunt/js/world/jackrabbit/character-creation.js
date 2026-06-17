// Modal handler that drives the Halberd HRS/ID/7(b) registration form.
// Spec: jackrabbit-pre-horizon-design.md §2.
//
// Sequence: alias -> profession -> real name -> confirm.
// "No" at confirm starts the form over (per D4 — do-over).
import { FLAG_FORM_COMPLETE, FLAG_PC_ALIAS, FLAG_PC_PROFESSION, FLAG_PC_REAL_NAME, HOOK_FORM_COMPLETE, PROFESSIONS, } from "./flags.js";
import { score } from "./scoring.js";
const HEADER = [
    "── HALBERD RECOVERY SERVICES ──",
    "── Contractor Identity Registration — Form HRS/ID/7(b) ──",
    "",
    "For official use. Retain copy for your records.",
    "This form will be destroyed after processing.",
    "(You must complete it before you can go any further.)",
    "",
];
const ALIAS_PROMPT = "Preferred name (travelling alias):";
const REAL_NAME_PROMPT = "Your actual name:";
function professionPrompt() {
    const lines = [
        "Profession (as declared at point of entry). Choose a number, or type your own:",
    ];
    PROFESSIONS.forEach((p, i) => lines.push(`  ${i + 1}. ${p}`));
    return lines;
}
export function makeCharacterCreationModal() {
    let step = "alias";
    let alias = "";
    let profession = "";
    let realName = "";
    function reset() {
        step = "alias";
        alias = "";
        profession = "";
        realName = "";
    }
    function confirmSummary() {
        return [
            "",
            "── Please confirm ──",
            `  Alias:      ${alias}`,
            `  Profession: ${profession}`,
            `  Real name:  ${realName}`,
            "",
            "Type YES to submit the form, or NO to start over.",
        ];
    }
    return {
        onEnter: () => [...HEADER, ALIAS_PROMPT],
        onInput: (line, state) => {
            const t = line.trim();
            if (step === "alias") {
                if (!t)
                    return { output: "Please enter a name." };
                alias = t;
                step = "profession";
                return { output: ["", ...professionPrompt()] };
            }
            if (step === "profession") {
                if (!t)
                    return { output: "Please choose a profession." };
                const n = parseInt(t, 10);
                if (/^\d+$/.test(t) && n >= 1 && n <= PROFESSIONS.length) {
                    profession = PROFESSIONS[n - 1];
                }
                else {
                    // Free-text profession. Anything not in the canonical list is
                    // accepted; NPC dialogue defaults to neutral tone for it. (D5)
                    profession = t;
                }
                step = "realName";
                return { output: ["", REAL_NAME_PROMPT] };
            }
            if (step === "realName") {
                if (!t)
                    return { output: "Please enter your real name." };
                realName = t;
                step = "confirm";
                return { output: confirmSummary() };
            }
            // step === "confirm"
            if (/^y(es)?$/i.test(t)) {
                state.flags[FLAG_PC_ALIAS] = alias;
                state.flags[FLAG_PC_PROFESSION] = profession;
                state.flags[FLAG_PC_REAL_NAME] = realName;
                state.flags[FLAG_FORM_COMPLETE] = true;
                score(state, HOOK_FORM_COMPLETE);
                return {
                    output: [
                        "",
                        "── Form complete. ──",
                        "",
                        "You sign with your alias, accept the acknowledgement, and set the",
                        "datapad down. The form's interface tidies itself away.",
                        "",
                        "A door to the north leads to the inner offices.",
                    ],
                    pop: true,
                };
            }
            if (/^n(o)?$/i.test(t)) {
                reset();
                return { output: ["", "Starting over.", "", ALIAS_PROMPT] };
            }
            return { output: "Please answer YES or NO." };
        },
    };
}
