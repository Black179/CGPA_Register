import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, VStack, Heading, Text, Table, Thead, Tbody, Tr, Th, Td, 
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Button, HStack,
  useToast
} from '@chakra-ui/react';
import axios from 'axios';

const ResultSummary = () => {
  const [userData, setUserData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (!savedData) {
      navigate('/');
      return;
    }
    setUserData(JSON.parse(savedData));
  }, [navigate]);

  const calculateCGPA = () => {
    if (!userData?.semesters?.length) return 0;
    
    const totalCredits = userData.semesters.reduce((sum, sem) => {
      return sum + sem.subjects.reduce((s, subj) => s + subj.credits, 0);
    }, 0);
    
    const weightedSum = userData.semesters.reduce((sum, sem) => {
      const semCredits = sem.subjects.reduce((s, subj) => s + subj.credits, 0);
      return sum + (sem.sgpa * semCredits);
    }, 0);
    
    return parseFloat((weightedSum / totalCredits).toFixed(2));
  };

  const handleSave = async () => {
    if (!userData) return;
    
    try {
      setIsSaving(true);
      await axios.post('http://localhost:5000/api/user', userData);
      
      toast({
        title: 'Success',
        description: 'Your results have been saved!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: 'Error',
        description: 'Failed to save results. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!userData) return null;

  const cgpa = calculateCGPA();

  return (
    <VStack spacing={6} align='stretch'>
      <Heading size='lg' textAlign='center'>Your Academic Summary</Heading>
      
      <Box>
        <Text fontSize='lg' fontWeight='bold'>Student Details</Text>
        <Text>Name: {userData.name}</Text>
        <Text>Register Number: {userData.registerNo}</Text>
        <Text>Section: {userData.section}</Text>
      </Box>

      <Box>
        <Text fontSize='lg' fontWeight='bold' mb={4}>Semester-wise Performance</Text>
        {userData.semesters.map(semester => (
          <Box key={semester.semesterNo} mb={6}>
            <Text fontWeight='bold'>Semester {semester.semesterNo} - SGPA: {semester.sgpa}</Text>
            <Table variant='simple' size='sm' mt={2}>
              <Thead>
                <Tr>
                  <Th>Code</Th>
                  <Th>Subject</Th>
                  <Th isNumeric>Credits</Th>
                  <Th>Grade</Th>
                  <Th isNumeric>Points</Th>
                </Tr>
              </Thead>
              <Tbody>
                {semester.subjects.map(subject => (
                  <Tr key={subject.code}>
                    <Td>{subject.code}</Td>
                    <Td>{subject.name}</Td>
                    <Td isNumeric>{subject.credits}</Td>
                    <Td>{subject.grade}</Td>
                    <Td isNumeric>{subject.gradePoint}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ))}
      </Box>

      <Stat>
        <StatLabel>Your CGPA</StatLabel>
        <StatNumber fontSize='4xl'>{cgpa}</StatNumber>
        <StatHelpText>
          <StatArrow type={cgpa >= 7.5 ? 'increase' : 'decrease'} />
          {cgpa >= 7.5 ? 'Excellent!' : 'Keep improving!'}
        </StatHelpText>
      </Stat>

      <HStack justify='space-between' mt={8}>
        <Button onClick={() => navigate('/semester-grades')}>Back to Grades</Button>
        <Button 
          colorScheme='blue' 
          onClick={handleSave}
          isLoading={isSaving}
          loadingText='Saving...'
        >
          Save Results
        </Button>
      </HStack>
    </VStack>
  );
};

export default ResultSummary;
