const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: 'eu-central-1_ekSFpRrS3',
            userPoolClientId: '4ihbu7qavch2jl05iiivb1o3a',
            loginWith: {
                oauth: {
                    domain: 'cryptotick-levan-app-prod-2026.auth.eu-central-1.amazoncognito.com',
                    scopes: ['email', 'openid', 'profile'],
                    redirectSignIn: ['http://localhost:5173/'],
                    redirectSignOut: ['http://localhost:5173/'],
                    responseType: 'code'
                }
            }
        }
    }
};

export default amplifyConfig;