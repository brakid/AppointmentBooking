import { useState } from 'react';
import './style.css';
import { gql, useApolloClient } from '@apollo/client';

const Login = () => {
  const client = useApolloClient();
  const [ token, setToken ] = useState<string | undefined>(localStorage.getItem('token') || undefined);
  const [ name, setName ] = useState<string>('');
  const [ email, setEmail ] = useState<string>('');

  const login = async () => {
    try {
      const response = await client.query({ 
        query: gql`
          query Login($emailAddress: String!, $name: String!) {
            login(emailAddress: $emailAddress, name: $name)
          }
        `,
        variables: { 
          emailAddress: email,
          name
        }
      });
      const token = response.data.login;
      console.log(token);
      setToken(token);
      localStorage.setItem('token', token);
      client.resetStore();
    } catch (err) {
      console.log(err);
      setToken(undefined);
    }
  };

  if (token) {
    return (
        <>
            <p>Name: { token.substring(0, 10) }</p>
        </>
    )
  };

  return (
    <div>
      <label htmlFor='nameField'>Name:</label>
      <input id='nameField' type='text' value={ name } onChange={ (e) => setName(e.target.value) } />
      <label htmlFor='emailField'>Email:</label>
      <input id='emailField' type='email' value={ email } onChange={ (e) => setEmail(e.target.value) } />
      <span>
        <button onClick={ () => login() }>Login</button>
      </span>
    </div>
  )
};

export default Login;
