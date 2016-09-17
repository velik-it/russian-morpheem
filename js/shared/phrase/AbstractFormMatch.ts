
import { InflectionForm, GrammaticalCase } from '../inflection/InflectionForms'
import AbstractQuantifierMatch from './AbstractQuantifierMatch'
import MatchContext from './MatchContext'

abstract class AbstractFormMatch extends AbstractQuantifierMatch {
    constructor(public form: InflectionForm, quantifier?: string) {
        super(quantifier)

        this.form = form
    }

    matchesForm(wordForm: InflectionForm, context: MatchContext): boolean {
        let form = this.form

        if (form) {
            if (form.grammaticalCase == GrammaticalCase.CONTEXT) {
                if (!context.overrideFormCase) {
                    return true
                }

                let id = 'contextCase' + context.overrideFormCase
                form = new InflectionForm(id, id, form)

                form.grammaticalCase = context.overrideFormCase
            }

            return form.matches(wordForm)
        }
        else {
            return true
        }
    }
}

export default AbstractFormMatch