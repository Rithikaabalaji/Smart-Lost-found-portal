/**
 * Login & Registration Page Logic Controller.
 */

import { auth } from './auth.js';
import { db } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const formSignIn = document.getElementById('formSignIn');
  const formSignUp = document.getElementById('formSignUp');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const alertBox = document.getElementById('authAlert');

  // Check URL params for pre-selecting sign-up tab
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'signup') {
    switchToSignUp();
  }

  function showAlert(message, type = 'error') {
    if (!alertBox) return;
    alertBox.className = `auth-alert ${type}`;
    alertBox.innerHTML = `
      <i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" style="width: 16px; height: 16px;"></i>
      <span>${message}</span>
    `;
    alertBox.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
  }

  function hideAlert() {
    if (alertBox) alertBox.style.display = 'none';
  }

  function switchToSignIn() {
    hideAlert();
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    formSignIn.style.display = 'flex';
    formSignUp.style.display = 'none';
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Sign in to manage your lost items and claim reports';
  }

  function switchToSignUp() {
    hideAlert();
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    formSignUp.style.display = 'flex';
    formSignIn.style.display = 'none';
    authTitle.textContent = 'Create an Account';
    authSubtitle.textContent = 'Join the campus community to report and recover items';
  }

  if (tabSignIn) tabSignIn.onclick = switchToSignIn;
  if (tabSignUp) tabSignUp.onclick = switchToSignUp;

  // Toggle Password Visibility
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" style="width: 16px; height: 16px;"></i>`;
        if (window.lucide) window.lucide.createIcons();
      }
    };
  });

  // Handle Sign In Submit
  if (formSignIn) {
    formSignIn.onsubmit = async (e) => {
      e.preventDefault();
      hideAlert();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const submitBtn = document.getElementById('signInSubmitBtn');

      if (!email || !password) {
        showAlert('Please fill in both email and password.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
      }

      try {
        await auth.signIn(email, password);
        showAlert('Sign in successful! Redirecting to portal...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);
      } catch (err) {
        console.error('Sign in error:', err);
        showAlert(err.message || 'Invalid email or password.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        }
      }
    };
  }

  // Handle Sign Up Submit
  if (formSignUp) {
    formSignUp.onsubmit = async (e) => {
      e.preventDefault();
      hideAlert();
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const phone = document.getElementById('signupPhone').value.trim();
      const password = document.getElementById('signupPassword').value;
      const confirmPassword = document.getElementById('signupConfirmPassword').value;
      const submitBtn = document.getElementById('signUpSubmitBtn');

      if (!name || !email || !password) {
        showAlert('Please fill in all required fields.');
        return;
      }

      if (password.length < 6) {
        showAlert('Password must be at least 6 characters.');
        return;
      }

      if (password !== confirmPassword) {
        showAlert('Passwords do not match.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
      }

      try {
        await auth.signUp(email, password, name, phone);
        showAlert('Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 900);
      } catch (err) {
        console.error('Sign up error:', err);
        showAlert(err.message || 'Could not create account. Please try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      }
    };
  }

  // Handle 1-Click Quick Demo Login Cards
  document.querySelectorAll('.demo-user-card').forEach(card => {
    card.onclick = () => {
      const userId = card.getAttribute('data-user-id');
      const userName = card.getAttribute('data-user-name');
      auth.loginDemoUser(userId);
      showAlert(`Signed in as ${userName}! Redirecting...`, 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    };
  });
});
