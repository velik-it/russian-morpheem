
import { FORMS, GrammaticalCase, Number } from './inflection/InflectionForms'

const pl = (form) => form.substr(form.length-2) == 'pl'
const sg = (form) => FORMS[form].number == Number.SINGULAR

const MASKS = {
    adj: {
        short: (form) => form.substr(0, 5) == 'short',
        shortandadv: (form) => form.substr(0, 5) == 'short' || form == 'adv',
        nonstd: (form) => form.substr(0, 5) == 'short' || form == 'adv' || form == 'comp',
        pl: pl,
        sg: sg,
        adv: (form) => form == 'adv',
        comp: (form) => form == 'comp',
        advandcomp: (form) => form == 'adv' || form == 'comp',
        compandshort: (form) => form == 'comp' || form.substr(0, 5) == 'short',
        allbutcompshortandadv: (form) => !(form == 'comp' || form == 'adv' ||form.substr(0, 5) == 'short'),
        allbutnom: (form) => FORMS[form].grammaticalCase != GrammaticalCase.NOM,
        allbutcomp: (form) => form != 'comp',
        allbutshort: (form) => form.substr(0, 5) != 'short',
        allbutpl: (form) => !pl(form),
        allbutadv: (form) => form != 'adv',
        allbutadvandcomp: (form) => form != 'adv' && form != 'comp',
        allbutplandadv: (form) => !pl(form) && form != 'adv'
    },
    num: {
        pl: pl,
        sg: sg
    },
    n: {
        pl: pl,
        sg: sg
    },
    v: {
        pl: pl,
        sg: (form) => form.substr(form.length-2) != 'pl' && form != 'inf',
        past: (form) => form.substr(0, 4) == 'past',
        impr: (form) => form.substr(0, 4) == 'impr',
        non_impr: (form) => form.substr(0, 4) !== 'impr'
    }
}

export default MASKS