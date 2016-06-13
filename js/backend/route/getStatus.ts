import * as express from 'express'

import { getStatus } from '../metadata/Metadata'
import { SentenceStatus } from '../../shared/metadata/SentenceStatus'
import Corpus from '../../shared/Corpus'

export default function(corpus: Corpus) {
    return (req: express.Request, res: express.Response) => {
        let sentenceId = parseInt(req.params['id'])

        if (isNaN(sentenceId)) {
            throw new Error('No sentence ID')
        }

        getStatus(sentenceId)
            .then((status: SentenceStatus) => {
                res.status(200).send(status)
            })
            .catch((e) => {
                console.log(e)
                res.status(500).send(e)
            })
    }
}