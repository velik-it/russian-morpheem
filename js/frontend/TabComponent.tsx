/// <reference path="../../typings/react/react.d.ts" />

import {Component, cloneElement, createElement} from 'react';
import Facts from './FactsComponent';
import Fact from './FactComponent';
import Sentence from './SentenceComponent';
import Corpus from '../shared/Corpus';
import Tab from './Tab';

let React = { createElement: createElement }

interface Props {
    corpus: Corpus,
    tab: Tab,
    close: (any) => any
}

interface State {
}

export default class TabSetComponent extends Component<Props, State> {
    contentElement: Element 
    
    componentWillUnmount() {
        this.props.tab.scrollTop = this.contentElement.scrollTop
    }
    
    componentDidMount() {
        this.contentElement.scrollTop = this.props.tab.scrollTop
    }
    
    render() {
        let factIndex
        let tab = this.props.tab
        
        if (tab.component.props.fact) {
            factIndex = this.props.corpus.facts.indexOf(tab.component.props.fact) + 1
        }
        
        return <div className='tab' key={ tab.id }>
            <div className='tab-header'>
                <div className='tab-name'>
                { (factIndex ?                             
                    <div className='index'><div className='number'>{ factIndex }</div></div>
                    : <div/>) }
                { tab.name }</div>
                <div className='tab-close' onClick={ this.props.close }>Close</div>
            </div>
            <div className='content' ref={ (element: Element) => this.contentElement = element }>
            {
                cloneElement(tab.component, { tab: tab })  
            }
            </div>
        </div>        
    }
}