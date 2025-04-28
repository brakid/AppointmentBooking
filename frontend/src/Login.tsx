import { useEffect, useState } from 'react';
import './style.css';
import { gql, useApolloClient } from '@apollo/client';

const Login = () => {
  const client = useApolloClient();
  const [ token, setToken ] = useState<string | undefined>(localStorage.getItem('token') || undefined);
  const [ name, setName ] = useState<string>('');
  const [ email, setEmail ] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await client.query({ 
            query: gql`
              query Refresh {
                refresh
              }
            `
          });
          const token = response.data.refresh;
          console.log(token);
          setToken(token);
          localStorage.setItem('token', token);
          client.resetStore();
        } catch (err) {
          console.log('No valid token - cleaning token from local storage: ' + err);
          setToken(undefined);
          localStorage.removeItem('token');
          client.resetStore();
        }
      }
    };

    init();
  }, []);

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
      console.log('Error - cleaning token from local storage: ' + err);
      setToken(undefined);
      localStorage.removeItem('token');
      client.resetStore();
    }
  };

  const logout = async () => {
    console.log('Loggin out - cleaning token from local storage');
    setToken(undefined);
    localStorage.removeItem('token');
    client.resetStore();
  };

  if (token) {
    return (
      <div>
        <p>Logged in</p>
        <span>
          <button onClick={ () => logout() }>Logout</button>
        </span>
      </div>
    );
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
  );
};

export default Login;