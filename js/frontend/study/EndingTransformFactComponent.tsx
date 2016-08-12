

import { Component, createElement } from 'react'
import { EndingTransform } from '../../shared/Transforms'

import { FactComponentProps } from './StudyFactComponent'

let React = { createElement: createElement }

let wordFactComponent = (props: FactComponentProps<EndingTransform>) => {
    return <div>
        <strong>
            { props.fact.from }
        </strong> is replaced with<strong>
            { props.fact.to }
        </strong> after <strong>
            { props.fact.after.split('').join(', ') }
        </strong>
    </div>
}

export default wordFactComponent;
